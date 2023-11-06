const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser")
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h7gpv70.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const foodCollection = client.db("shareSurplus").collection("foodsCollection");
        const foodRequestCollection = client.db("shareSurplus").collection("foodRequestCollection");


        //  * Services Related API 
        //  * add Foods

        app.post("/foods", async (req, res) => {
            const food = req.body;
            const result = await foodCollection.insertOne(food);
            res.send(result);
        });

        // get all Foods 
        app.get("/foods", async (req, res) => {
            const cursot = foodCollection.find();
            const result = await cursot.toArray();
            res.send(result);
        });

        // get personal Foods 
        app.get("/foods", verifyToken, async (req, res) => {
            let query = {};
            if (req.user.email !== req.query.email) {
                return res.status(403).send("Access Forbbiden");
            }
            if (req.query?.email) {
                query = { email: req.query.email }
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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