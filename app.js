// backend/server.js
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'goodreads.db');
let db = null;

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(5000, () => {
            console.log('Server Running at http://localhost:5000/');
        });
    } catch (e) {
        console.log(`DB error: ${e.message}`);
        process.exit(1);
    }
};
initializeDbAndServer();

app.get('/employees/', async (request, response) => {
    try {
        const allEmployees = `SELECT * FROM employees;`;
        const result = await db.all(allEmployees);
        response.send(result);
    } catch (error) {
        console.error(`Error fetching employees: ${error.message}`);
        response.status(500).send('Internal Server Error');
    }
});

app.post('/addemployees/', async (request, response) => {
  const { name, email, mobile_no, designation, gender, course, image } = request.body;

  try {
      // Check if the email already exists
      const emailCheckQuery = `SELECT * FROM employees WHERE email = ?;`;
      const existingEmail = await db.get(emailCheckQuery, [email]);

      if (existingEmail) {
          return response.status(400).json({ error: 'Email already exists.' });
      }

      // Insert the new employee, ID will auto-increment
      const query = `
          INSERT INTO employees (name, email, mobile_no, designation, gender, course, image, created_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const createdDate = new Date().toISOString();
      await db.run(query, [name, email, mobile_no, designation, gender, course, image, createdDate]);

      response.status(201).json({ message: 'Employee added successfully.' });
  } catch (error) {
      console.error(`Error adding employee: ${error.message}`);
      response.status(500).json({ error: 'Internal Server Error' });
  }
});




app.put('/updateemployee/:id', async (request, response) => {
  const employeeId = request.params.id;
  const { name, email, mobile_no, designation, gender, course, image } = request.body;

  // Input validation (basic example)
  if (!name || !email || !mobile_no || !designation || !gender) {
    return response.status(400).json({ error: 'All fields except image are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return response.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    // Check if the employee exists
    const employeeCheckQuery = `SELECT * FROM employees WHERE id = ?;`;
    const existingEmployee = await db.get(employeeCheckQuery, [employeeId]);

    if (!existingEmployee) {
      return response.status(404).json({ error: 'Employee not found.' });
    }

    // Check for email conflicts if the email is changed
    if (existingEmployee.email !== email) {
      const emailCheckQuery = `SELECT * FROM employees WHERE email = ?;`;
      const existingEmail = await db.get(emailCheckQuery, [email]);

      if (existingEmail) {
        return response.status(400).json({ error: 'Email already exists.' });
      }
    }

    const query = `
      UPDATE employees
      SET name = ?, email = ?, mobile_no = ?, designation = ?, gender = ?, course = ?, image = ?
      WHERE id = ?;
    `;
    
    await db.run(query, [name, email, mobile_no, designation, gender, course, image, employeeId]);

    response.status(200).json({ message: 'Employee updated successfully.' });
  } catch (error) {
    console.error(`Error updating employee: ${error.message}`);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/employees/:id', async (request, response) => {
  const { id } = request.params;

  // Validate the ID (ensure it's a number, for instance)
  if (!id || isNaN(id)) {
      return response.status(400).json({ error: 'Invalid employee ID.' });
  }

  try {
      const query = `DELETE FROM employees WHERE id = ?;`;
      const result = await db.run(query, [id]);

      // Check if any row was deleted
      if (result.changes === 0) {
          return response.status(404).json({ error: 'Employee not found.' });
      }

      response.status(200).json({ message: 'Employee deleted successfully.' });
  } catch (error) {
      console.error(`Error deleting employee: ${error.message}`);
      response.status(500).json({ error: 'Internal Server Error' });
  }
});



// these are users backend  

app.post('/users/', async (request, response) => {
    const {username, name, password, gender, location} = request.body
    const hashedPassword = await bcrypt.hash(request.body.password, 10)
    const selectUserQuery = ` SELECT * FROM users WHERE username = '${username}'`
  
    const dbUser = await db.get(selectUserQuery)
  
    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO 
      users (username, name, password, gender, location)
     VALUES
      (
        '${username}',
        '${name}',
        '${hashedPassword}',
        '${gender}',
        '${location}'  
      );`
      await db.run(createUserQuery)
      response.send('user created succesfully')
    } else {
      response.status(400)
      response.send('username already exists')
    }
  })


  app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        response.send("Login Success!");
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });