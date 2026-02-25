// backend/src/utils/invoiceGenerator.js
const pool = require('../config/database');

async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const result = await pool.query(
        `SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`,
        [`INV-${year}-%`]
    );
    
    const count = parseInt(result.rows[0].count) + 1;
    const sequential = String(count).padStart(4, '0');
    
    return `INV-${year}-${sequential}`;
}

module.exports = { generateInvoiceNumber };