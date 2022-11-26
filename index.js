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
        const ordersCollection = client.db("cadence-watches").collection("orders");

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
            next();
        }

        const verifySeller = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
            next();
        }

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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            let query = {}
            if (req.query.role) {
                query = { role: req.query.role }
            }
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/users', async (req, res) => {
            const email = req.query.email;
            const filterUser = { email: email };
            const updateUser = {
                $set: {
                    status: 'verified'
                }
            }
            const userResult = await usersCollection.updateOne(filterUser, updateUser);
            const filterProducts = { sellerEmail: email };
            const updateProducts = {
                $set: {
                    sellerStatus: 'verified'
                }
            }
            const productsResult = await productsCollection.updateMany(filterProducts, updateProducts);
            res.send(userResult);
        })

        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            if (result) {
                res.send(result);
            }
        })

        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateProduct = {
                $set: {
                    advertise: 'true'
                }
            }
            const result = await productsCollection.updateOne(filter, updateProduct);
            res.send(result);
        })

        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/products/:email', verifyJWT, verifySeller, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const productId = order.productId;
            console.log(productId);
            const filter = { _id: ObjectId(productId) };
            const updateProduct = {
                $set: {
                    status: 'sold'
                }
            }
            const updatedProduct = await productsCollection.updateOne(filter, updateProduct);
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const result = await ordersCollection.find(query).toArray();
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