const db = require('../db');

exports.listPayments = async (req, res) => {
  const { start_date, end_date } = req.query;
  const user = req.user;
  try {
    let query = `
      SELECT t.*, a.name as agent_name 
      FROM trips t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE (t.approved = true OR t.is_booking = true)
    `;
    let params = [];
    
    // Ownership filtering
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      query += ` AND t.user_id = $${params.length + 1}`;
      params.push(user.id);
    }

    if (start_date && end_date) {
      query += ` AND t.created_at BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(start_date, end_date);
    }
    
    query += ' ORDER BY t.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updatePayment = async (req, res) => {
  const { amount_paid, penalty_cost, remarks } = req.body;
  try {
    const result = await db.query(
      'UPDATE trips SET amount_paid=$1, penalty_cost=$2, remarks=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [amount_paid, penalty_cost, remarks, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.generateInvoice = async (req, res) => {
  // Skeleton for PDF generation - in a real app this would use PDFKit or puppeteer
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from('PDF Content Placeholder'));
};

exports.generateTaxInvoice = async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from('Tax Invoice PDF Content Placeholder'));
};
