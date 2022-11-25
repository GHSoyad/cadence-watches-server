const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized User' })
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next()
    })
}

app.get('/jwt', (req, res) => {
    const email = req.query.email;
    const token = jwt.sign({ email }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '24h' });
    res.send({ token });
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7r6jn89.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db("cadence-watches").collection("categories");
        const usersCollection = client.db("cadence-watches").collection("users");
        const productsCollection = client.db("cadence-watches").collection("products");

        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/category/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { category: id, status: 'available' };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
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