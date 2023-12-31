const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: ["https://sharesurplus.surge.sh"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decode;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h7gpv70.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const foodCollection = client
      .db("shareSurplus")
      .collection("foodsCollection");

    const userCollection = client.db("shareSurplus").collection("user");
    const foodRequestCollection = client
      .db("shareSurplus")
      .collection("foodRequestCollection");

    // Auth Related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //  * Services Related API
    //  * add User
    app.post("/users", async (req, res) => {
      const food = req.body;
      const result = await userCollection.insertOne(food);
      res.send(result);
    });

    // get all Foods
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //  * add Foods

    app.post("/foods", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    // get all Foods
    app.get("/foods", async (req, res) => {
      let filter = {};
      if (req.query?.s) {
        filter = { foodname: { $regex: req.query?.s, $options: "i" } };
      }
      const cursor = foodCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get my all Foods
    app.get("/myfoods", verifyToken, async (req, res) => {
      if (req.query?.email !== req.user?.email) {
        res.status(403).send({ message: "Access forbbiden" });
      }
      let filter = {};
      if (req.query?.email) {
        filter = { donoremail: req.query?.email };
      }
      const cursor = foodCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get Single Food
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    // Update Foods 
    app.patch("/foodupdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = req.body;
      const options = { upsert: true };
      const updateproduct = {
        $set: {
          foodname: food.foodname,
          foodimage: food.foodimage,
          foodquantity: food.foodquantity,
          expiredate: food.expiredate,
          pickuplocation: food.pickuplocation,
          additionalnotes: food.additionalnotes,
          foodstatus: food.foodstatus
        },
      };
      res.send(await foodCollection.updateOne(query, updateproduct, options));
    })

    // Food Status Update 
    app.patch("/foodstatus/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const food = req.body;
        const updateproduct = {
          $set: {
            foodstatus: food.foodstatus,
          },
        };
        const result = await foodCollection.updateOne(query, updateproduct);
        if (result.matchedCount === 0) {
          res.status(404).send("Document not found");
        } else {
          res.status(200).send({ success: true });
        }
      } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).send("Internal Server Error");
      }
    })


    // Food Request Track in Food Collection  
    app.patch("/foodrequesttrack/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const food = req.body;
        const updateproduct = {
          $set: {
            foodrequesttrack: food.foodrequesttrack,
          },
        };
        const result = await foodCollection.updateOne(query, updateproduct);
        if (result.matchedCount === 0) {
          res.status(404).send("Document not found");
        } else {
          res.status(200).send(result);
        }
      } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).send("Internal Server Error");
      }
    })

    // Foods Delete 
    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    // Food Request Api
    app.post("/rqFoods", async (req, res) => {
      const food = req.body;
      res.send(await foodRequestCollection.insertOne(food));
    });

    // Get Single Request Food
    app.get("/rqFoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { foodid: id };
      const result = await foodRequestCollection.findOne(query);
      res.send(result);
    });

    // Get my Food Request
    app.get("/rqFoods", verifyToken, async (req, res) => {
      if (req.query?.email !== req.user?.email) {
        res.status(403).send({ message: "Access forbbiden" });
      }
      let filter = {};
      if (req.query?.email) {
        filter = { useremail: req.query?.email };
      }
      const cursor = foodRequestCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Requested Foods Status Update 
    app.patch("/reqfoodstatus/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { foodid: id };
        const food = req.body;
        const updateproduct = {
          $set: {
            foodstatus: food.foodstatus,
          },
        };
        const result = await foodRequestCollection.updateOne(query, updateproduct);
        if (result.matchedCount === 0) {
          res.status(404).send("Document not found");
        } else {
          res.status(200).send({ success: true });
        }
      } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).send("Internal Server Error");
      }
    })

    // Delete Food Request
    app.delete("/rqFoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodRequestCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("shareSurplus Server is Running");
});

app.listen(port, () => {
  console.log(`shareSurplus Server is Running on Port: ${port}`);
});
