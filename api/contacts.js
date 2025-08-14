const fs = require('fs').promises;
const path = require('path');
const vCardsJS = require('vcards-js');

const DB_PATH = path.join(process.cwd(), 'data', 'contacts.json');

async function loadContacts() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading contacts:', e);
    return { count: 0, contacts: [] };
  }
}

async function saveContacts(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving contacts:', e);
    return false;
  }
}

function normalizePhoneNumber(number) {
  return number.replace(/\D/g, '');
}

module.exports = async (req, res) => {
  // Initialize database if not exists
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ count: 0, contacts: [] }, null, 2));
  }

  if (req.method === 'GET') {
    const db = await loadContacts();
    return res.json(db);
  }

  if (req.method === 'POST') {
    const { fullName, number, countryCode } = req.body;
    const db = await loadContacts();

    if (!db.contacts) db.contacts = [];

    const normalizedName = fullName.trim();
    const normalizedCountryCode = normalizePhoneNumber(countryCode);
    const normalizedNumber = normalizePhoneNumber(number);
    const fullPhoneNumber = `+${normalizedCountryCode}${normalizedNumber}`;

    // Validation (same as before)
    if (!normalizedName || !/^[a-zA-Z\s\-.,'"()]+$/.test(normalizedName)) {
    return res.status(400).json({ 
      error: 'Name can contain letters, spaces, and basic punctuation (-.,\'"())',
      field: 'fullName'
    });
  }

  if (!normalizedNumber || normalizedNumber.length < 5) {
    return res.status(400).json({ 
      error: 'Phone number must be at least 5 digits',
      field: 'number'
    });
  }

  // Check duplicates
  const nameExists = db.contacts.some(c => 
    c.fullName.toLowerCase() === normalizedName.toLowerCase()
  );
  const numberExists = db.contacts.some(c => 
    normalizePhoneNumber(c.number) === normalizePhoneNumber(fullPhoneNumber)
  );

  if (nameExists) return res.status(400).json({ error: 'Name already exists!', field: 'fullName' });
  if (numberExists) return res.status(400).json({ error: 'Phone number already exists!', field: 'number' });
    // ... your validation logic ...

    const newContact = {
      id: Date.now().toString(),
      fullName: normalizedName,
      number: fullPhoneNumber,
      timestamp: new Date().toISOString()
    };

    db.contacts.push(newContact);
    db.count = db.contacts.length;

    if (await saveContacts(db)) {
      return res.json({ success: true, count: db.count, contact: newContact });
    } else {
      return res.status(500).json({ error: 'Failed to save contact' });
    }
  }

  return res.status(405).send('Method Not Allowed');
};
