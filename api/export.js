const fs = require('fs').promises;
const path = require('path');
const vCardsJS = require('vcards-js');

const DB_PATH = path.join(process.cwd(), 'data', 'contacts.json');

module.exports = async (req, res) => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    if (db.contacts && db.contacts.length > 0) {
      let vcfData = '';
      
      db.contacts.forEach(contact => {
        const card = new vCardsJS();
        const nameParts = contact.fullName.split(' ');
        card.firstName = nameParts[0] || '';
        card.lastName = nameParts.slice(1).join(' ') || '';
        card.cellPhone = contact.number;
        vcfData += card.getFormattedString();
      });

      res.setHeader('Content-Type', 'text/vcard');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
      return res.send(vcfData);
    } else {
      return res.status(404).send('No contacts found');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
};
