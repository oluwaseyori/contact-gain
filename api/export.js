const fs = require('fs').promises;
const path = require('path');
const vCardsJS = require('vcards-js');

const DB_PATH = path.join(process.cwd(), 'data', 'contacts.json');

module.exports = async (req, res) => {
  try {
    // 1. Load contacts data
    const data = await fs.readFile(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    // 2. Check if contacts exist
    if (!db.contacts || db.contacts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No contacts available to export',
        suggestion: 'Add contacts first before exporting'
      });
    }

    // 3. Generate vCards
    let vcfData = db.contacts.map(contact => {
      try {
        const card = new vCardsJS();
        
        // Split name intelligently
        const nameParts = contact.fullName.split(/\s+/);
        card.firstName = nameParts[0] || '';
        card.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        // Format phone numbers
        const cleanNumber = contact.number.replace(/\D/g, '');
        card.cellPhone = cleanNumber;
        card.workPhone = cleanNumber; // Include in multiple fields
        
        // Add metadata
        card.note = `Added to Seyori's contact network on ${new Date(contact.timestamp).toLocaleDateString()}`;
        
        return card.getFormattedString();
      } catch (cardError) {
        console.error(`Error processing contact ${contact.id}:`, cardError);
        return null;
      }
    }).filter(Boolean).join('\n'); // Remove any failed cards

    // 4. Send response
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="seyori_contacts.vcf"');
    res.setHeader('X-Contact-Count', db.contacts.length);
    return res.send(vcfData);

  } catch (error) {
    console.error('Export failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate contact file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
