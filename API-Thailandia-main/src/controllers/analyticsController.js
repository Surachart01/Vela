const db = require('../db');

exports.getDashboardMetrics = async (req, res) => {
  const user = req.user;
  const isAgent = user.role === 'agent';
  const userId = user.id;

  const whereClause = isAgent ? 'WHERE user_id = $1' : 'WHERE 1=1';
  const params = isAgent ? [userId] : [];

  try {
    // 1. Basic Counts
    const countsResult = await db.query(`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE is_booking = false) as total_quotations,
        COUNT(*) FILTER (WHERE is_booking = true AND approved = true) as total_bookings,
        SUM(final_amount) FILTER (WHERE is_booking = true AND approved = true) as total_revenue
      FROM trips
      ${whereClause}
    `, params);

    const counts = countsResult.rows[0];
    const totalQuotations = parseInt(counts.total_quotations) || 0;
    const confirmedBookings = parseInt(counts.total_bookings) || 0;
    const totalRevenue = parseFloat(counts.total_revenue) || 0;
    const totalPaid = 0; // Temporarily 0 until amount_paid is fully added to the schema
    const totalTrips = parseInt(counts.total_trips) || 0;

    // 2. Calculated Metrics
    const conversionRate = totalTrips > 0 ? (confirmedBookings / totalTrips) * 100 : 0;
    const averageDealSize = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
    const outstandingAmount = totalRevenue - totalPaid;

    // 3. User Stats
    const clientsResult = await db.query(`
      SELECT COUNT(DISTINCT client_name) as unique_clients
      FROM trips
      ${whereClause}
    `, params);
    const totalUniqueClients = parseInt(clientsResult.rows[0].unique_clients) || 0;

    // 4. Value Ranges (High/Medium)
    const valueResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE final_amount > 100000) as high_value,
        COUNT(*) FILTER (WHERE final_amount BETWEEN 25000 AND 100000) as medium_value
      FROM trips
      ${whereClause} AND is_booking = true AND approved = true
    `, params);
    const highValue = parseInt(valueResult.rows[0].high_value) || 0;
    const mediumValue = parseInt(valueResult.rows[0].medium_value) || 0;

    res.json({
      totalQuotations: { value: totalQuotations, change: '→ no change' },
      confirmedBookings: { value: confirmedBookings, change: '→ no change' },
      conversionRate: { value: parseFloat(conversionRate.toFixed(1)), change: '→ no change' },
      averageDealSize: { value: parseFloat((averageDealSize / 1000).toFixed(1)), change: '→ no change' }, // Represented in K
      avgCloseTime: { value: 2.0, change: '→ no change' }, // Mocking this for now as we don't have conversion_date
      winRate: { value: parseFloat(conversionRate.toFixed(1)), change: '→ no change' },
      
      monthlyRevenue: { value: parseFloat((totalRevenue / 1000).toFixed(1)), change: '→ no change' }, // Represented in K
      collectionRate: { value: parseFloat(collectionRate.toFixed(1)), change: '→ no change' },
      quotationsPerWeek: { value: parseFloat((totalQuotations / 4).toFixed(2)), change: '→ no change' }, // Approximate
      outstandingAmount: { value: parseFloat((outstandingAmount / 1000).toFixed(1)), change: '→ no change' },
      
      repeatCustomerRate: { value: 0.0, change: '→ no change' }, // Needs deeper analysis
      totalUniqueClients: { value: totalUniqueClients, change: '→ no change' },
      highValueBookings: { value: highValue, change: '→ no change' },
      mediumValueBookings: { value: mediumValue, change: '→ no change' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMonthlyTrends = async (req, res) => {
  const user = req.user;
  const isAgent = user.role === 'agent';
  const userId = user.id;

  const whereClause = isAgent ? 'WHERE user_id = $1' : 'WHERE 1=1';
  const params = isAgent ? [userId] : [];

  try {
    const trendsResult = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        DATE_TRUNC('month', created_at) as month_date,
        COUNT(*) FILTER (WHERE is_booking = false) as quotations,
        COUNT(*) FILTER (WHERE is_booking = true AND approved = true) as bookings,
        SUM(final_amount) FILTER (WHERE is_booking = true AND approved = true) as revenue
      FROM trips
      ${whereClause}
      GROUP BY month, month_date
      ORDER BY month_date DESC
      LIMIT 12
    `, params);

    res.json(trendsResult.rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
