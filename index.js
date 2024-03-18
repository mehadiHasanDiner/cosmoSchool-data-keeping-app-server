const express = require("express");
const app = express();
cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ehabgxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const itemsCollection = client.db("cosmoSchoolDB").collection("items");

    const employeesCollection = client
      .db("cosmoSchoolDB")
      .collection("employees");

    const purchasesCollection = client
      .db("cosmoSchoolDB")
      .collection("purchases");

    const storeCollection = client.db("cosmoSchoolDB").collection("store");

    const employeesExpenseCollection = client
      .db("cosmoSchoolDB")
      .collection("expenseCollection");

    app.post("/addItem", async (req, res) => {
      const content = req.body;
      content.createdAt = new Date();
      const result = await itemsCollection.insertOne(content);
      res.send(result);
    });

    app.get("/addItem/:branchName", async (req, res) => {
      const branchName = req.params.branchName;
      const query = { branchName: branchName };
      const result = await itemsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // load specific item (but not taking all of the specific service)
    app.get("/addpurchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        // Include only the `title` and `imdb` fields in each returned document
        projection: { itemName: 1, itemCategory: 1, branchName: 1 },
      };

      const result = await itemsCollection.findOne(query, options);
      res.send(result);
    });

    app.post("/addEmployee", async (req, res) => {
      const content = req.body;
      content.createdAt = new Date();
      const result = await employeesCollection.insertOne(content);
      res.send(result);
    });

    app.get("/addEmployee/:branchName", async (req, res) => {
      const branchName = req.params.branchName;
      const query = { branchName: branchName };
      const result = await employeesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // load specific item (but not taking all of the specific service)
    app.get("/employeeExpenseDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        // Include only the `title` and `imdb` fields in each returned document
        projection: { employeeName: 1, designation: 1, branchName: 1 },
      };

      const result = await employeesCollection.findOne(query, options);
      res.send(result);
    });

    // post purchase data and update store collection
    app.post("/purchase", async (req, res) => {
      const purchaseData = req.body;
      purchaseData.createdAt = new Date();
      // Insert purchase details into purchasesCollection
      const insertPurchaseResult = await purchasesCollection.insertOne(
        purchaseData
      );

      const purchaseId = insertPurchaseResult.insertedId;
      const { itemName, itemCategory, branchName, itemQuantity } = purchaseData;

      // Retrieve current itemQuantity from storeCollection
      const currentProductDetails = await storeCollection.findOne({
        itemName,
        itemCategory,
        branchName,
        itemQuantity,
      });

      // Calculate new itemQuantity
      const newItemQuantity = currentProductDetails
        ? currentProductDetails.itemQuantity + itemQuantity
        : itemQuantity;

      // Update product details in storeCollection
      const options = { upsert: true };
      const updateProductDetails = await storeCollection.updateOne(
        { itemName, itemCategory, branchName },
        {
          $set: {
            itemName,
            itemCategory,
            branchName,
            purchaseDate: purchaseData.purchaseDate,
            voucherNo: purchaseData.voucherNo,
          },
          // Update itemQuantity by adding it to the previous quantity
          $inc: { itemQuantity: itemQuantity },
        },
        options
      );
      res.send(updateProductDetails);
    });

    // all purchased items date wise
    app.get("/purchase/:branchName", async (req, res) => {
      const branchName = req.params.branchName;
      const query = { branchName: branchName };
      const result = await purchasesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // all stored item itemName names wise.
    app.get("/store/:branchName", async (req, res) => {
      const branchName = req.params.branchName;
      const query = { branchName: branchName };
      const result = await storeCollection
        .find(query)
        .sort({ itemName: 1 })
        .toArray();
      res.send(result);
    });

    // update store when take items
    app.put("/takeFromStore/:itemId", async (req, res) => {
      const itemId = req.params.itemId;
      const { quantity } = req.body;
      const result = await storeCollection.updateOne(
        { _id: new ObjectId(itemId) },
        { $inc: { itemQuantity: -quantity } }
      );
      res.send(result);
    });

    // save user expense data
    app.post("/employeeExpense", async (req, res) => {
      const expenseData = req.body;
      const result = await employeesExpenseCollection.insertOne(expenseData);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
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
  res.send("Welcome to Cosmo School Database");
});

app.listen(port, () => {
  console.log(`Cosmo server listening on port ${port}`);
});
