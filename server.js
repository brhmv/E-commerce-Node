const cluster = require('cluster');
const os = require('os');
const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config();
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const basketRoutes = require('./routes/basketRoutes');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());


if (cluster.isMaster) {
    const numCPUs = os.cpus().length;

    console.log(`Master ${process.pid} is running`);
    console.log(`Forking ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Forking a new one...`);
        cluster.fork();
    });
} else {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log(`Connected to MongoDB`))
        .catch(err => console.error('Connection error:', err));

    app.use('/orders', orderRoutes);
    app.use('/products', productRoutes);
    app.use('/users', userRoutes);
    app.use('/auth', authRoutes);
    app.use('/basket', basketRoutes);


    app.listen(port, () => {
        console.log(`Worker ${process.pid} running on port ${port}`);
    });
}