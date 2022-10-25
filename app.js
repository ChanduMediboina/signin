const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(process.env.PORT || 3000, () => {
      console.log("server Running on http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//To know users

app.get("/users/", async (request, response) => {
  const getAllUsersQuery = `
    SELECT * from 
    user`;
  const allUsers = await db.all(getAllUsersQuery);
  response.send(allUsers);
});

// API 1

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await db.get(checkUserQuery);

  if (dbUser !== undefined) {
    response.status(400);
    response.send({ error_msg: "User already exists" });
  } else {
    if (password.length < 5) {
      response.status(400);
      response.send({ error_msg: "Password is too short" });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
      INSERT INTO 
      user(username,name,password,gender,location)
      VALUES 
      (
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}');`;

      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  }
});

//API login

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `SELECT * FROM user where username='${username}';`;
  const dbUser = await db.get(checkUserQuery);

  if (dbUser !== undefined) {
    //login query
    const verifyPassword = await bcrypt.compare(password, dbUser.password);
    if (verifyPassword === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "secret-token");

      response.status(200);
      response.send({ jwt_token: jwtToken });
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid password" });
    }
  } else {
    //no user data
    response.status(400);
    response.send({ error_msg: "Invalid user" });
  }
});

//API PUT change password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `SELECT * from user where username='${username}';`;
  const dbUser = await db.get(checkUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid Username" });
  } else {
    const verifyPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (verifyPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send({ error_msg: "Password is too short" });
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE user
          SET
          password = '${hashedPassword}'
          where 
          username='${username}';`;

        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid current password" });
    }
  }
});

module.exports = app;
