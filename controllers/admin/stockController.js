const User = require('../../models/userschema');
const Admin = require('../../models/adminschema')
const Category = require('../../models/categoryschema');
const Product = require('../../models/prductschema');
const mongoose = require('mongoose');

const loadInventoryPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const skip = (page - 1) * limit;

        const [totalProducts, products, categories] = await Promise.all([
            Product.countDocuments(),
            Product.find({}).sort({ _id: -1 }).skip(skip).limit(limit),

        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render("inventoryMangement", {
            products,
            currentPage: page,
            totalPages,
            previousPage,
            nextPage,
        });

    } catch (error) {
        console.error("Error in product management:", error.message);
        res.status(500).send("An error occurred while fetching products and categories.");
    }
}

const editStock = async (req, res) => {
    try {
        const { productname, regularprice, stock } = req.body;
        const { id } = req.params;


        if (!productname || !regularprice || !stock) {
            console.error("Validation failed: Missing fields");
            return res.status(400).send({ message: "All fields are required" });
        }


        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { productname, regularprice, stock },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            console.error(`Product with ID ${id} not found`);
            return res.status(404).send({ message: "Product not found" });
        }


        res.redirect("/admin/inventoryManagement");
    } catch (error) {
        console.error("Error while updating product:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};


module.exports = {
    loadInventoryPage,
    editStock
}
