// Companies and User Localities Routes

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Create a new company
router.post('/', async (req, res) => {
  try {
    const { name, org_number, contact_name, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const query = `
      INSERT INTO companies (name, org_number, contact_name, contact_email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [name, org_number, contact_name, contact_email]);

    res.status(201).json({ company: rows[0] });
  } catch (error) {
    console.error('Error creating company:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Company with this org number already exists' });
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get all aquaculture companies/owners
router.get('/', async (req, res) => {
  try {
    const { getAquacultureCompanies } = require('../services/fiskeridirektoratet');

    const companies = await getAquacultureCompanies();

    res.json({
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get sites for a specific company
router.get('/:companyName/sites', async (req, res) => {
  try {
    const { getCompanySites } = require('../services/fiskeridirektoratet');
    const { companyName } = req.params;
    const decodedName = decodeURIComponent(companyName);

    const sites = await getCompanySites(decodedName);

    res.json({
      companyName: decodedName,
      count: sites.length,
      sites
    });
  } catch (error) {
    console.error('Error fetching company sites:', error);
    res.status(500).json({ error: 'Failed to fetch company sites' });
  }
});

// Add a user locality
router.post('/user-localities', async (req, res) => {
  try {
    const { company_id, locality_no, name, latitude, longitude, municipality } = req.body;

    if (!company_id || !locality_no || !name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
      INSERT INTO user_localities (company_id, locality_no, name, latitude, longitude, municipality)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [company_id, locality_no, name, latitude, longitude, municipality]);

    res.status(201).json({ locality: rows[0] });
  } catch (error) {
    console.error('Error adding user locality:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Locality already added' });
    }
    res.status(500).json({ error: 'Failed to add locality' });
  }
});

// Get user localities for a company
router.get('/user-localities', async (req, res) => {
  try {
    const { company_id } = req.query;

    let query = 'SELECT * FROM user_localities WHERE is_active = true';
    const params = [];

    if (company_id) {
      query += ' AND company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY name ASC';

    const { rows } = await pool.query(query, params);

    res.json({ localities: rows });
  } catch (error) {
    console.error('Error fetching user localities:', error);
    res.status(500).json({ error: 'Failed to fetch user localities' });
  }
});

module.exports = router;
