const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();
const app = express();
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
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
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const foodCollection = client.db("shareSurplus").collection("foodsCollection");
        const foodRequestCollection = client.db("shareSurplus").collection("foodRequestCollection");
        // Auth Related API 
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            })
                .send({ success: true });
        });
        app.post("/logout", async (req, res) => {
            const user = req.body;
            res.clearCookie("token", { maxAge: 0 }).send({ success: true });
        });

        //  * Services Related API 
        //  * add Foods

        app.post("/foods", async (req, res) => {
            const food = req.body;
            const result = await foodCollection.insertOne(food);
            res.send(result);
        });

        // get all Foods 
        app.get("/foods", async (req, res) => {
            let filter = {}
            if (req.query?.s) {
                filter = { foodname: { $regex: req.query?.s, $options: 'i' } }
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
            let filter = {}
            if (req.query?.email) {
                filter = { donoremail: req.query?.email }
            }
            // console.log(filter);
            const cursor = foodCollection.find(filter);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Get Single Food 
        app.get("/foods/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query);
            console.log(result);
            res.send(result);
        })


        // Food Request Api 
        app.post("/rqFoods", async (req, res) => {
            const food = req.body;
            res.send(await foodRequestCollection.insertOne(food));
        });

        // Get my Food Request 
        app.get("/rqFoods", verifyToken, async (req, res) => {
            if (req.query?.email !== req.user?.email) {
                res.status(403).send({ message: "Access forbbiden" });
            }
            let filter = {}
            if (req.query?.email) {
                filter = { useremail: req.query?.email }
            }
            const cursor = foodRequestCollection.find(filter);
            const result = (await cursor.toArray());
            res.send(result);
        });

        // Delete Food Request 
        app.delete("/rqFoods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodRequestCollection.deleteOne(query);
            res.send(result);
        })

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