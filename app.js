const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

let db = null;
const initializeDBAndUser = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDBAndUser();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT *
    FROM user
    WHERE username = ${username}`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `INSERT INTO user (username,name,password,gender,location)
        VALUES (${username},${name},${hashedPassword},${gender},${location})`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    const passwordLength = password.length;
    if (passwordLength > 5) {
      response.send(`created new user with ${newUserId}`);
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = ` SELECT *
    FROM user 
    WHERE username = ${username}`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE username = ${username}`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);

    if (isValidPassword === true) {
      const passwordLength = newPassword.length;

      if (passwordLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        const updateUserQuery = `
                UPDATE user
                SET password = ${hashPassword}
                Where username = ${username}`;
        await db.run(updateUserQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
