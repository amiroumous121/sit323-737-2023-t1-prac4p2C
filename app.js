const expressLib = require("express");
const axiosLib = require("axios");
const bodyParse = require("body-parser");
const passp = require("passport");
const JWTStrategy = require("passport-jwt").Strategy;
const JWTExtractor = require("passport-jwt").ExtractJwt;
const jwtLib = require("jsonwebtoken");
const env = require("dotenv");
const winstonLib = require("winston");

env.config();

const serverApp = expressLib();
serverApp.use(expressLib.json());
serverApp.use(bodyParse.urlencoded({ extended: false }));
serverApp.use(passp.initialize());

const logCreator = winstonLib.createLogger({
  level: "info",
  format: winstonLib.format.json(),
  defaultMeta: { service: "calculation-service" },
  transports: [
    new winstonLib.transports.File({ filename: "error.log", level: "error" }),
    new winstonLib.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logCreator.add(
    new winstonLib.transports.Console({
      format: winstonLib.format.simple(),
    })
  );
}

const jwtOpt = {
  jwtFromRequest: JWTExtractor.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
};

passp.use(
  new JWTStrategy(jwtOpt, function (payload, callback) {
    const foundUser = userList.find((user) => user.id === payload.id);

    if (foundUser) {
      return callback(null, foundUser);
    } else {
      return callback(null, false);
    }
  })
);

const auth = passp.authenticate("jwt", { session: false });

const userList = [
  { id: 1, name: "Amir" },
  { id: 2, name: "John" },
  { id: 3, name: "Stacy" },
];

serverApp.post("/login", (req, resp) => {
  const { name } = req.body;
  const foundUser = userList.find((user) => user.name === name);

  if (foundUser) {
    const token = jwtLib.sign({ id: foundUser.id }, jwtOpt.secretOrKey, {
      expiresIn: "1h",
    });
    resp.json({ token });
  } else {
    resp.status(401).send("Invalid credentials");
  }
});

serverApp.get("/hello", (req, resp) => {
  resp.send("Hello, world!");
});

serverApp.get("/data", auth, async (req, resp, next) => {
  try {
    const apiResponse = await axiosLib.get(
      "https://jsonplaceholder.typicode.com/todos/1"
    );
    const apiData = apiResponse.data;
    resp.json(apiData);
  } catch (error) {
    console.error(error);
    next(new Error("Error retrieving data"));
  }
});

serverApp.get("/users", auth, (req, resp) => {
  resp.send(userList);
});

serverApp.post("/users", auth, (req, resp) => {
  const addedUser = { id: 4, name: "Jane" };
  userList.push(addedUser);
  resp.send(userList);
});

serverApp.put("/users/:id", auth, (req, resp) => {
  const uId = req.params.id;
  const uName = req.body.name;
  const foundUser = userList.find((user) => user.id === parseInt(uId));
  if (foundUser) {
    foundUser.name = uName;
    resp.send(userList);
  } else {
    resp.status(404).send("User not found");
  }
});

serverApp.delete("/users/:id", auth, (req, resp) => {
  const uId = parseInt(req.params.id);
  const userIndex = userList.findIndex((user) => user.id === uId);
  if (userIndex === -1) {
    return resp.status(404).send("User not found");
  }
  userList.splice(userIndex, 1);
  resp.send(userList);
});

serverApp.use((err, req, resp, next) => {
  console.error(err);
  resp.status(500).send(err.message);
});

const listenPort = 3000;
serverApp.listen(listenPort, () => {
  console.log(`Listening to port ${listenPort}`);
});
