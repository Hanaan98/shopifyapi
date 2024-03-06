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
      try {
        const products = await shopify.product.list(params);
        jsonProducts = jsonProducts.concat(products);
        params = products.nextPageParameters;
      } catch (error) {
        console.error("Error fetching products:", error);

        continue;
      }
    } while (params !== undefined);
    const transformedData = jsonProducts.map((product) => ({
      id: product.id,
      mpn: product.variants[0].sku,
      title: product.title,
      item_group_id: product.variants[0].sku,
      link: `https://daytonahelmets.com/products/${product.handle}`,
      MSRP: product.variants[0].price,
      wholesale_price: "",
      image_link: product.image ? product.image.src : "",
      other_image_url1: "",
      other_image_url2: "",
      other_image_url3: "",
      other_image_url4: "",
      other_image_url5: "",
      other_image_url6: "",
      other_image_url7: "",
      other_image_url8: "",
      product_type: product.product_type,
      brand: product.vendor,
      availability:
        product.variants[0].inventory_quantity > 0
          ? "in stock"
          : "out of stock",
      qty_on_hand: product.variants[0].inventory_quantity,
      shipping_weight: product.variants[0].weight,
      description: product.body_html,
      upc_code: product.variants[0].barcode,
    }));
    // Convert to CSV
    const csvData = json2csv(transformedData);

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
