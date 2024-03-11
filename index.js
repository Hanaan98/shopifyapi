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

    let transformedData = [];

    // Iterate through each product
    jsonProducts.forEach((product) => {
      // Check if the product has variants
      if (product.variants && product.variants.length > 0) {
        // Iterate through each variant of the product
        product.variants.forEach((variant) => {
          const titleWithoutSize = product.title.replace(/-\s*\w+\s*$/, ""); // Remove the last word (size)
          const variantData = {
            id: product.id,
            title: `${titleWithoutSize}`,
            description: product.body_html,
            price: variant.price,
            availability:
              variant.inventory_quantity > 0 ? "in stock" : "out of stock",
            link: `https://daytonahelmets.com/products/${product.handle}`,
            image_link: product.image ? product.image.src : "",
            condition: "new", // Assuming all products are new
            brand: product.vendor,
            mpn: variant.sku,
            qty_on_hand: variant.inventory_quantity,
            shipping_weight: variant.weight,
            product_type: product.product_type,
          };
          transformedData.push(variantData);
        });
      } else {
        // If no variants, add the product without variant title
        const productData = {
          id: product.id,
          title: product.title,
          description: product.body_html,
          price: product.variants[0].price,
          availability:
            product.variants[0].inventory_quantity > 0
              ? "in stock"
              : "out of stock",
          link: `https://daytonahelmets.com/products/${product.handle}`,
          image_link: product.image ? product.image.src : "",
          condition: "new", // Assuming all products are new
          brand: product.vendor,
          mpn: product.variants[0].sku,
          qty_on_hand: product.variants[0].inventory_quantity,
          shipping_weight: product.variants[0].weight,
          product_type: product.product_type,
        };
        transformedData.push(productData);
      }
    });

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
