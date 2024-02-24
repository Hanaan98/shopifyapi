const express = require("express");
const app = express();
const json2csv = require("json2csv").parse;
const fs = require("fs");
require("dotenv").config();
const Shopify = require("shopify-api-node");
const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.ACCESS_TOKEN,
});

const PORT = 5000;

app.get("/feed", async (req, res) => {
  try {
    let params = { limit: 250 };
    let jsonProducts = [];

    do {
      const products = await shopify.product.list(params);
      jsonProducts = jsonProducts.concat(products);
      params = products.nextPageParameters;
    } while (params !== undefined);

    // Convert to CSV
    const csvData = json2csv(jsonProducts);

    // Write CSV file
    fs.writeFile("products.csv", csvData, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to generate CSV file" });
      } else {
        console.log("CSV file has been generated!");

        res.setHeader(
          "Content-disposition",
          "attachment; filename=products.csv"
        );
        res.set("Content-Type", "text/csv");

        const stream = fs.createReadStream("products.csv");
        stream.pipe(res);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
