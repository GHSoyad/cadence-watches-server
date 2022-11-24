const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7r6jn89.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db("cadence-watches").collection("categories");
        const usersCollection = client.db("cadence-watches").collection("users");

        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

    }
    finally { }

}

run().catch(error => console.log(error))

app.get('/', (req, res) => {
    res.send('Server is Running!!');
})

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
})