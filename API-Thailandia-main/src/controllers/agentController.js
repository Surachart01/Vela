const db = require('../db');

exports.listAgents = async (req, res) => {
  const user = req.user;
  let query = 'SELECT * FROM agents';
  let params = [];

  if (user.role === 'agent') {
    query += ' WHERE user_id = $1';
    params.push(user.id);
  }

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** ดึง Markup ของ Agent ที่ผูกกับ user ที่ login อยู่ (ใช้งานได้ทุก role) */
exports.getMyMarkup = async (req, res) => {
  const user = req.user;
  if (!user.agent_id) {
    return res.status(404).json({ message: 'No agent linked to this user.' });
  }
  try {
    const agentRes = await db.query('SELECT * FROM agents WHERE id = $1', [user.agent_id]);
    if (agentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found.' });
    }
    const agent = agentRes.rows[0];
    if (!agent.markup_group) {
      return res.status(404).json({ message: 'Agent has no markup group assigned.' });
    }
    const markupRes = await db.query(
      `SELECT m.*, COALESCE(json_agg(hmp.*) FILTER (WHERE hmp.id IS NOT NULL), '[]') AS hotel_markup_percentages
       FROM markups m
       LEFT JOIN hotel_markup_percentages hmp ON hmp.markup_id = m.id
       WHERE LOWER(TRIM(m.markup_group)) = LOWER(TRIM($1))
       GROUP BY m.id`,
      [agent.markup_group]
    );
    if (markupRes.rows.length === 0) {
      return res.status(404).json({ message: `Markup group '${agent.markup_group}' not found.` });
    }
    res.json(markupRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** ดึง Markup ของ Agent ตาม ID (admin/superadmin เรียกใช้เพื่อดู markup ของ agent ที่เลือก) */
exports.getAgentMarkup = async (req, res) => {
  const { id } = req.params;
  try {
    const agentRes = await db.query('SELECT * FROM agents WHERE id = $1', [id]);
    if (agentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found.' });
    }
    const agent = agentRes.rows[0];
    if (!agent.markup_group) {
      return res.status(404).json({ message: 'Agent has no markup group assigned.' });
    }
    const markupRes = await db.query(
      `SELECT m.*, COALESCE(json_agg(hmp.*) FILTER (WHERE hmp.id IS NOT NULL), '[]') AS hotel_markup_percentages
       FROM markups m
       LEFT JOIN hotel_markup_percentages hmp ON hmp.markup_id = m.id
       WHERE LOWER(TRIM(m.markup_group)) = LOWER(TRIM($1))
       GROUP BY m.id`,
      [agent.markup_group]
    );
    if (markupRes.rows.length === 0) {
      return res.status(404).json({ message: `Markup group '${agent.markup_group}' not found.` });
    }
    res.json(markupRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.createAgent = async (req, res) => {
  const { name, markup_group, address, email, telephone, fax, payment_deadline_type, payment_deadline_days } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO agents (name, markup_group, address, email, telephone, fax, user_id, payment_deadline_type, payment_deadline_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, markup_group, address, email, telephone, fax, req.user.id, payment_deadline_type || 'eom', payment_deadline_days || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail.includes('name') ? 'Name' : 'Field';
      return res.status(400).json({ message: `This ${field.toLowerCase()} is already registered to another agent.` });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateAgent = async (req, res) => {
  const user = req.user;
  const { name, markup_group, address, email, telephone, fax, payment_deadline_type, payment_deadline_days } = req.body;
  try {
    // Check ownership
    const agentRes = await db.query('SELECT user_id FROM agents WHERE id = $1', [req.params.id]);
    if (agentRes.rows.length === 0) return res.status(404).json({ message: 'Agent not found' });
    
    if (user.role === 'agent' && agentRes.rows[0].user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await db.query(
      'UPDATE agents SET name=$1, markup_group=$2, address=$3, email=$4, telephone=$5, fax=$6, payment_deadline_type=$7, payment_deadline_days=$8 WHERE id=$9 RETURNING *',
      [name, markup_group, address, email, telephone, fax, payment_deadline_type || 'eom', payment_deadline_days || 0, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail.includes('name') ? 'Name' : 'Field';
      return res.status(400).json({ message: `This ${field.toLowerCase()} is already registered to another agent.` });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteAgent = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  try {
    // Check ownership
    const agentRes = await db.query('SELECT user_id FROM agents WHERE id = $1', [id]);
    if (agentRes.rows.length === 0) return res.status(404).json({ message: 'Agent not found' });
    
    if (user.role === 'agent' && agentRes.rows[0].user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.query('DELETE FROM agents WHERE id = $1', [id]);
    res.json({ message: 'Agent deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
