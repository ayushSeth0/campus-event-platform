const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'events_db',
  password: 'your_password',
  port: 5432,
});

const seedDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      date DATE,
      organizer_id VARCHAR(50),
      location VARCHAR(100),
      FOREIGN KEY (organizer_id) REFERENCES users(uid)
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER,
      user_id VARCHAR(50),
      user_name VARCHAR(100),
      status VARCHAR(20),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(uid)
    );
  `);

  const users = [
    { uid: 'student1', name: 'Alice', role: 'student' },
    { uid: 'organizer1', name: 'Charlie', role: 'organizer' },
    { uid: 'admin1', name: 'Diana', role: 'admin' },
  ];
  for (const user of users) {
    await pool.query('INSERT INTO users (uid, name, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [user.uid, user.name, user.role]);
  }

  const events = [
    { name: 'Tech Conference 2025', description: 'Annual tech conference...', date: '2025-10-15', organizer_id: 'organizer1', location: 'Main Auditorium' },
    { name: 'Campus Music Festival', description: 'A day of live music...', date: '2025-11-05', organizer_id: 'organizer1', location: 'University Lawn' },
  ];
  for (const event of events) {
    await pool.query('INSERT INTO events (name, description, date, organizer_id, location) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', [event.name, event.description, event.date, event.organizer_id, event.location]);
  }
};

seedDatabase().catch(console.error);

// API Endpoints
app.get('/api/events', async (req, res) => {
  const result = await pool.query('SELECT * FROM events');
  res.json(result.rows);
});

app.get('/api/registrations/pending', async (req, res) => {
  const result = await pool.query('SELECT * FROM registrations WHERE status = $1', ['pending']);
  res.json(result.rows);
});

app.post('/api/registrations', async (req, res) => {
  const { eventId, userId, userName } = req.body;
  await pool.query('INSERT INTO registrations (event_id, user_id, user_name, status) VALUES ($1, $2, $3, $4)', [eventId, userId, userName, 'pending']);
  res.json({ message: 'Registration successful' });
});

app.put('/api/registrations/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await pool.query('UPDATE registrations SET status = $1 WHERE id = $2', [status, id]);
  res.json({ message: `Registration ${status}` });
});

app.post('/api/events', async (req, res) => {
  const { name, description, date, location, organizerId } = req.body;
  const result = await pool.query('INSERT INTO events (name, description, date, organizer_id, location) VALUES ($1, $2, $3, $4, $5) RETURNING id', [name, description, date, organizerId, location]);
  res.json({ id: result.rows[0].id, message: 'Event created' });
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, date, location } = req.body;
  await pool.query('UPDATE events SET name = $1, description = $2, date = $3, location = $4 WHERE id = $5', [name, description, date, location, id]);
  res.json({ message: 'Event updated' });
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM events WHERE id = $1', [id]);
  res.json({ message: 'Event deleted' });
});

app.listen(5000, () => console.log('Server running on port 5000'));