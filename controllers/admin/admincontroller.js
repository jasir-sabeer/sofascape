const User = require('../../models/userschema');
const Admin = require('../../models/adminschema')
const Category = require('../../models/categoryschema');
const Product = require('../../models/prductschema');

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pageerror = async (req, res) => {
    res.render('admin-error');
}

const loadadminLogin = (req, res) => {
   
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
            return res.render("adminLogin", { message: "admin not found" });
        }

        console.log(password); 
        console.log(existAdmin.password); 
 


        if(existAdmin.password===password){
            req.session.adminlogin=true
            res.redirect("/admin/dashboard");
        }else{
            return res.render("adminLogin", { message: "Incorrect password" })
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

const loaduserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 4; 
        const skip = (page - 1) * limit;

        const [totalUsers,users] = await Promise.all([
            User.countDocuments(),
            User.find({}).skip(skip).sort({_id:-1}).limit(limit),
           
        ]);

        const totalPages = Math.ceil(totalUsers / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render("userManagement", {
            users,
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
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 3; 
        const skip = (page - 1) * limit;

        const [totalCategories, categories] = await Promise.all([
            Category.countDocuments(),
            Category.find({}).skip(skip).sort({_id:-1}).limit(limit),
           
        ]);

        const totalPages = Math.ceil(totalCategories / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render("categoryManagement", {
            categories,
            currentPage: page,
            totalPages,
            previousPage,
            nextPage,
            err:req.flash('err')
        });

    } catch (error) {
        console.error("Error in product management:", error.message);
        res.status(500).send("An error occurred while fetching products and categories.");
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, variant } = req.body;
        const formattedName = name.trim().toLowerCase();
        const formattedVariant=variant.trim().toLowerCase();

        const existingCategory = await Category.findOne({ name: { $regex: `^${formattedName}$`, $options: 'i'},variant:{$regex:`^${formattedVariant}$`,$options:'i'}});
        if (existingCategory) {
            console.log('Category already exists');
            return res.status(400).json({ error: 'This category name already exists' });
        }

        const newCategory = new Category({ name: formattedName, variant:formattedVariant, isListed: true });
        await newCategory.save();
        res.status(200).json({ message: 'Category added successfully' });
    } catch (error) {
        console.error('Error adding category:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const editCategory = async (req, res) => {
    try {
        const { id, name, variant } = req.body;
        const formattedName = name.trim().toLowerCase();
        const formattedVariant=variant.trim().toLowerCase();

        
        const existingCategory = await Category.findOne({
            name: { $regex: `^${formattedName}$`, $options: 'i' },
            _id: { $ne: id },
            variant:{$regex:`^${formattedVariant}$`,$options:'i'}
        });

        if (existingCategory) {
            console.log('Category already exists');
            return res.status(400).json({ error: 'This category name already exists' });
        }
        await Category.findByIdAndUpdate(id, { name, variant });
        return res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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



const loadProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 3; 
        const skip = (page - 1) * limit;

        const [totalProducts, products, categories] = await Promise.all([
            Product.countDocuments(),
            Product.find({}).populate('category').sort({ _id: -1  }).skip(skip).limit(limit),
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

const loadAddProduct=async(req,res)=>{

try {
    const categories=await Category.find({isListed:true})
    res.render('addProduct',{categories})
} catch (error) {
    console.error("Error in product management:", error.message);
    res.status(500).send("An error occurred while fetching products .");
}
}




const addProduct = async (req, res) => {
    try {
        const { productname, description, regularprice, category, stock } = req.body;
        const images = req.files;

        
        if (!productname || !regularprice || !category || !description || !stock) {
            console.error("Validation failed: Missing fields");
            // return res.status(400).json({ message: 'Please fill all required fields' });
            return 
        }

       
    
        if (!images || images.length < 1) {
            console.error("Validation failed: No images uploaded");
            return
        }

        
        const categoryDoc = await Category.findOne({ name: category });
        if (!categoryDoc) {
            console.error("Category not found");
            return
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
      console.log('images ',images)
  
      if (!productname || !description || !regularprice || !category || !stock) {
        return res.status(400).send("All fields are required");
      }
  
      if (regularprice <= 0) {
        return res.status(400).send({ message: 'Invalid price  value' });
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
    loadAddProduct,
    addProduct,
    editProduct,
    logout,
    toggleProductStatus


}
