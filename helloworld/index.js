// const functions = require('@google-cloud/functions-framework');
// const escapeHtml = require('escape-html');

// /**
//  * Responds to an HTTP request using data from the request body parsed according
//  * to the "content-type" header.
//  *
//  * @param {Object} req Cloud Function request context.
//  * @param {Object} res Cloud Function response context.
//  */
// functions.http('helloHttp', (req, res) => {
//   res.send(`Hello ${escapeHtml(req.query.name || req.body.name || 'World')}!`);
// });

const express = require('express');
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql');

const app = express();
const port = process.env.PORT || 8080;

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create connection to Google SQL database
const connection = mysql.createConnection({
  host: '34.136.206.47',
  user: 'user',
  password: 'pass',
  database: 'se422-sqlserver'
});

// Create connection to Google Cloud Storage
const storage = new Storage();
const bucketName = 'photos_se422';
const bucket = storage.bucket(bucketName);

// Define routes

// Route for serving login page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Route for handling login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Query the database to check if the username and password are correct
  const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
  connection.query(sql, [username, password], (error, results, fields) => {
    if (error) {
      console.error('Error during login:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 1) {
      // Successful login
      res.redirect('/home');
    } else {
      // Invalid username or password
      res.status(401).send('Invalid username or password');
    }
  });
});

// Route for serving new account creation page
app.get('/new_account', (req, res) => {
  res.sendFile(__dirname + '/new_account.html');
});

// Route for handling new account form submission
app.post('/new_account', (req, res) => {
  const { username, password } = req.body;

  // Check if the username is available
  const sql = `SELECT * FROM users WHERE username = ?`;
  connection.query(sql, [username], (error, results, fields) => {
    if (error) {
      console.error('Error checking username availability:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 0) {
      // Username is available, create new account
      const insertSql = `INSERT INTO users (username, password) VALUES (?, ?)`;
      connection.query(insertSql, [username, password], (error, results, fields) => {
        if (error) {
          console.error('Error creating new account:', error);
          res.status(500).send('Internal Server Error');
          return;
        }

        res.redirect('/');
      });
    } else {
      // Username is already taken
      res.status(400).send('Username is already taken');
    }
  });
});

// Route for serving home page after successful login
app.get('/home', (req, res) => {
  // Retrieve images from database or GCS and render home page
  // Example: Fetch images from database and render home page
  const sql = `SELECT * FROM images`;
  connection.query(sql, (error, results, fields) => {
    if (error) {
      console.error('Error fetching images:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.render('home', { images: results });
  });
});

// Route for handling image upload
app.post('/upload_image', (req, res) => {
  // Handle image upload logic here
  // Example: Upload image to Google Cloud Storage and save its metadata to the database
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
