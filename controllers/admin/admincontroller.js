const User = require('../../models/userschema');
const Admin = require('../../models/adminschema')
const Category = require('../../models/categoryschema');
const Product = require('../../models/prductschema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pageerror = async (req, res) => {
    res.render('admin-error');
}

const loadadminLogin = (req, res) => {
    console.log("wow",req.session)
    console.log("admin check",req.session.adminlogin)
    if (req.session.adminlogin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin', { message: null });
}





const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);

        const existAdmin = await Admin.findOne({ email: email }); 

        if (!existAdmin) {
            console.log("Admin not found");
            return res.redirect("/admin/adminLogin");
        }

        console.log(password); 
        console.log(existAdmin.password); 
 


        if(existAdmin.password===password){
            req.session.adminlogin=true
            res.redirect("/admin/dashboard");
        }else{
            res.status(400).send("poyi oomb")

        }
    

    } catch (error) {
        console.error("Login error:", error);
        return res.redirect("/pageerror");
    }
};



const loadDashboard = async (req, res) => {

    try {
        res.render("dashboard");
    } catch (error) {
        res.redirect('/pageerror');
    }
}
//user management
const loaduserManagement = async (req, res) => {

    try {
        const users = await User.find({});
        res.render("userManagement", { users });
    } catch (error) {
        res.redirect('/pageerror');
    }


}

const blockUser = async (req, res) => {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.redirect('/pageerror');
    }
    try {
        await User.findByIdAndUpdate(userId, { isblocked: true });
        res.redirect("/admin/userManagement");
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const unblockUser = async (req, res) => {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.redirect('/pageerror');
    }
    try {
        await User.findByIdAndUpdate(userId, { isblocked: false });
        res.redirect("/admin/userManagement");
    } catch (error) {
        res.redirect('/pageerror');
    }
}

//category management
const loadCategory = async (req, res) => {

    try {
        const categories = await Category.find({});
        console.log(categories);

        res.render('categoryManagement', { categories });
    } catch (error) {
        console.error("Error loading categories:", error);
        res.status(500).send("An error occurred while loading categories.");
    }

};
const addCategory = async (req, res) => {
    try {
        const { name, variant } = req.body;

        const formattedName = name.trim().toLowerCase();


        const existingCategory = await Category.findOne({ name: { $regex: `^${formattedName}$`, $options: 'i' } });
        if (existingCategory) {

            return res.status(400).send("Category with this name already exists.");
        }


        const newCategory = new Category({ name: formattedName, variant, isListed: true });
        await newCategory.save();


        res.redirect('/admin/categoryManagement');
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).send('Internal Server Error');
    }
};


const editCategory = async (req, res) => {
    try {
        const { id, name, variant } = req.body;
        await Category.findByIdAndUpdate(id, { name, variant });
        res.redirect('/admin/categoryManagement');
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).send('Internal Server Error');
    }
};


const toggleCategoryStatus = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findById(categoryId);
        const newStatus = !category.isListed;
        await Category.findByIdAndUpdate(categoryId, { isListed: newStatus });
        res.redirect("/admin/categoryManagement");
    } catch (error) {
        console.error('Error toggling category status:', error);
        res.status(500).send('Internal Server Error');
    }
};


//product management

const loadProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 3; 
        const skip = (page - 1) * limit;

        const [totalProducts, products, categories] = await Promise.all([
            Product.countDocuments(),
            Product.find({}).populate('category').skip(skip).limit(limit),
            Category.find({isListed:true})
        ]);

        const totalPages = Math.ceil(totalProducts / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render("productManagement", {
            categories,
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
};





const addProduct = async (req, res) => {
    try {
        const { productname, description, regularprice, category, stock } = req.body;
        const images = req.files;

        
        if (!productname || !regularprice || !category || !description || !stock) {
            console.error("Validation failed: Missing fields");
            return res.status(400).send({ message: 'Please fill all required fields' });
        }

        if (regularprice <= 0 || stock <= 0) {
            console.error("Validation failed: Invalid price or stock");
            return res.status(400).send({ message: 'Invalid price or stock value' });
        }

    
        if (!images || images.length < 1) {
            console.error("Validation failed: No images uploaded");
            return res.status(400).send({ message: 'Please upload at least one image' });
        }

        
        const categoryDoc = await Category.findOne({ name: category });
        if (!categoryDoc) {
            console.error("Category not found");
            return res.status(400).send({ message: 'Invalid category' });
        }

        
        const imagePaths = images.map(file => file.filename);

        
        const newProduct = new Product({
            productname,
            description,
            regularprice,
            category: categoryDoc._id,  
            stock,
            images: imagePaths
        });

        
        await newProduct.save();
        res.redirect("/admin/productManagement");
    } catch (error) {
        console.error("Error while adding product:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};



const editProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const { productname, description, regularprice, category, stock } = req.body;
      const images = req.files; 
  
      if (!productname || !description || !regularprice || !category || !stock) {
        return res.status(400).send("All fields are required");
      }
  
      if (regularprice <= 0 || stock <= 0) {
        return res.status(400).send({ message: 'Invalid price or stock value' });
      }
  
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).send("Product not found");
      }
  
      let updatedImages = product.images || [];
      if (images && images.length > 0) {
        const newImagePaths = images.map(file => file.path);
        updatedImages = [...updatedImages, ...newImagePaths];
      }
  
      await Product.findByIdAndUpdate(id, {
        productname,
        images: updatedImages,
        regularprice,
        description,
        category,
        stock
      });
  
      res.redirect("/admin/productManagement");
    } catch (error) {
      console.error("Error updating product: ", error.message);
      res.status(500).send("Error updating product: " + error.message);
    }
  };
  const toggleProductStatus = async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId);
        const newStatus = !product.isListed;
        await Product.findByIdAndUpdate(productId, { isListed: newStatus });
        res.redirect("/admin/productManagement");
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).send('Internal Server Error');
    }
};
  


const logout = async (req, res) => {
    req.session.admin = false; 

    
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/admin/adminLogin'); 
    })
}


module.exports = {
    loadadminLogin,
    login,
    loadDashboard,
    pageerror,
    loaduserManagement,
    blockUser,
    unblockUser,
    loadCategory,
    addCategory,
    editCategory,
    toggleCategoryStatus,
    loadProduct,
    addProduct,
    editProduct,
    logout,
    toggleProductStatus


}
