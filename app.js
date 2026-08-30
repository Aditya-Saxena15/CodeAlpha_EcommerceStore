const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Product = require("./models/Product");
const Order = require("./models/Order");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const session = require("express-session");

mongoose.connect("mongodb://127.0.0.1:27017/EcommerceDB")
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log(err);
    });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false
}));

function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

async function IsAdmin(req,res,next){
    if(!req.session.userId){
        return res.redirect("/login");
    }
    let user = await User.findById(req.session.userId);

    if(!user){
        return res.send("User not found");
    }

    if(user.role!== "admin"){
        return res.status(403).send("Access Denied");
    }

    next ();

}


app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.post("/register", async (req, res) => {
    try {
        req.body.password = await bcrypt.hash(req.body.password, 10);
        let newUser = new User(req.body);
        console.log(newUser);
        await newUser.save();
        res.redirect("/");
    }
    catch (err) {
        console.log(err);
        res.send(err.message);
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    try {
        let email = req.body.email;
        let password = req.body.password;
        if (!email || !password) {
            return res.send("Please fill all the fields");
        }


        let user = await User.findOne({ email: email });


        if (!user) {
            return res.send("User not  found");
        }
        let result = await bcrypt.compare(password, user.password);


        if (!result) {
            return res.send("Wrong password");
        }
        req.session.userId = user._id;
        if(user.role== "admin"){
            return res.redirect("/admin");
        }

        res.redirect("/profile");
    }
    catch (err) {
        console.log(err);
        res.send("Login failed");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.send("Logout failed");
        }
        res.redirect("/login");
    });
});

app.get("/profile", async(req, res) => {
    if (!req.session.userId) {
        return res.send("Please Login First");
    }
    let user = await User.findById(req.session.userId);

     if (!user) {
        return res.send("User not found");
    }
    res.render("profile.ejs", { user });
});

app.get("/admin",IsAdmin,async(req,res) => {
    res.render("admin.ejs");
});

app.get("/admin/products", IsAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        res.render("adminProducts.ejs", {
            products
            });
    } catch (err) {
        console.log(err);
        res.send("Unable to load products");
    }
});

app.get("/admin/products/edit/:id", IsAdmin, async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.send("Product not found");
        }

        res.render("edit.ejs", { product });

    } catch (err) {
        console.log(err);
        res.send("Unable to edit product");
    }
});

app.post("/admin/products/edit/:id", IsAdmin, async (req, res) => {
    try {

        await Product.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        res.redirect("/admin/products");

    } catch (err) {
        console.log(err);
        res.send("Unable to update product");
    }
});

app.post("/admin/products/delete/:id", IsAdmin, async (req, res) => {
    try {

        await Product.findByIdAndDelete(req.params.id);

        res.redirect("/admin/products");

    } catch (err) {
        console.log(err);
        res.send("Unable to delete product");
    }
});

app.get("/product", async (req, res) => {
    const Products = await Product.find({});
    res.render("index.ejs", { Products });
});

app.get("/admin/product/new", IsAdmin, (req, res) => {
    res.render("new.ejs");
});

app.post("/admin/product/new", IsAdmin, async (req, res) => {
    try {
        let newProducts = new Product(req.body);
        console.log(newProducts);
        await newProducts.save();
        res.redirect("/product");
    }
    catch (err) {
        console.log(err);
        res.send("Unable to add product");
    }
});

app.get("/admin/orders", IsAdmin, async (req, res) => {
    try {
        let orders = await Order.find({})
            .populate("user")
            .populate("items.product")
            .sort({ createdAt: -1 });

        res.render("adminOrders.ejs", { orders });

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});

app.post("/admin/orders/status/:id", IsAdmin, async (req, res) => {
    try {
        let { status } = req.body;

        await Order.findByIdAndUpdate(
            req.params.id,
            { status: status }
        );

        res.redirect("/admin/orders");

    } catch (err) {
        console.log(err);
        res.send("Unable to update order status");
    }
});

app.get("/admin/users", IsAdmin, async (req, res) => {
    try {
        const users = await User.find({});

        res.render("adminUsers.ejs", { users });

    } catch (err) {
        console.log(err);
        res.send("Unable to load users");
    }
});

app.get("/cart", async (req, res) => {
    try {
        if (!req.session.cart || req.session.cart.length === 0) {
            return res.render("cart.ejs", {
                products: [],
                total: 0
            });
        }

        let cart = req.session.cart;

        let products = [];

        for (let item of cart) {
            let product = await Product.findById(item.productId);

            if (product) {
                products.push({
                    product: product,
                    quantity: item.quantity
                });
            }
        }

        let total = 0;

        for (let item of products) {
            total += item.product.price * item.quantity;
        }

        res.render("cart.ejs", {
            products,
            total
        });
    }
    catch (err) {
        console.log(err);
        res.send("Unable to load cart");
    }
});

app.post("/cart/add/:id", async (req, res) => {
    try {
        let productId = req.params.id;

        if (!req.session.cart) {
            req.session.cart = [];
        }
        let existingProduct = req.session.cart.find(
            item => item.productId.toString() === productId,
        );

        if (existingProduct) {
            existingProduct.quantity += 1;
        }
        else {
            req.session.cart.push({
                productId: productId,
                quantity: 1
            });
        }
        res.redirect("/cart")
    }
    catch (err) {
        console.log(err);
        res.send("unable to add product to cart");
    }
});

app.post("/cart/remove/:id", (req, res) => {
    try {
        let productId = req.params.id;

        if (!req.session.cart) {
            return res.redirect("/cart");
        }

        req.session.cart = req.session.cart.filter(
            item => item.productId !== productId
        );

        res.redirect("/cart");
    }
    catch (err) {
        console.log(err);
        res.send("Unable to remove product");
    }
});

app.post("/cart/increase/:id", (req, res) => {
    try {
        let productId = req.params.id;

        if (!req.session.cart) {
            return res.redirect("/cart");
        }

        let item = req.session.cart.find(
            item => item.productId === productId
        );

        if (item) {
            item.quantity += 1;
        }

        res.redirect("/cart");
    }
    catch (err) {
        console.log(err);
        res.send("Unable to increase quantity");
    }
});

app.post("/cart/decrease/:id", (req, res) => {
    try {
        let productId = req.params.id;

        if (!req.session.cart) {
            return res.redirect("/cart");
        }

        let item = req.session.cart.find(
            item => item.productId === productId
        );

        if (item) {
            item.quantity -= 1;

            if (item.quantity <= 0) {
                req.session.cart = req.session.cart.filter(
                    item => item.productId !== productId
                );
            }
        }

        res.redirect("/cart");
    }
    catch (err) {
        console.log(err);
        res.send("Unable to decrease quantity");
    }
});

app.get("/checkout",isLoggedIn,(req,res)=>{
    res.render("Checkout.ejs");
});

app.post("/checkout", async(req,res)=>{
    try{
        if (!req.session.userId) {
            return res.redirect("/login");
        }
        let {
            fullName,
            phone,
            address,
            city,
            state,
            pinCode
        } = req.body;

        console.log(req.body);

        if (!fullName || !phone || !address || !city || !state || !pinCode) {
            return res.send("Please fill all the fields");
        }

        let items = [];
        let totalAmount =0;

        for(let cartitem of req.session.cart){
            let product = await Product.findById(cartitem.productId);
            if(!product){
                continue;
            }
            items.push({
                product: product._id,
                quantity: cartitem.quantity,
                price: product.price
            });

            totalAmount += product.price * cartitem.quantity;
        }
        if(items.length === 0){
            return res.send("No valid products in cart");
        }

        let newOrder = new Order({
            user : req.session.userId,
            items: items,
            totalAmount: totalAmount,
              address: {
                FullName: fullName,
                Phone: phone,
                Street: address,
                City: city,
                State: state,
                PINcode: pinCode
            }
        });
        await newOrder.save();

        req.session.cart= [];

        res.send("Order Placed Successfully");
    }
        catch (err) {
        console.log(err);
        res.send("Checkout failed");
    }
});

app.get("/order",isLoggedIn,async(req,res)=>{
    try{
        let order = await Order.findOne({
            user: req.session.userId,
        })
        .sort({ createdAt : -1 })
        .populate("items.product");

        if(!order){
            return res.send("No order found");
        }
        res.render("Order.ejs", { order });
    }
    catch(err){
        console.log(err);
        return res.send("unable to load order");
    }
});

app.get("/product/:id", async (req, res) => {
    try {
        let id = req.params.id;
        let product = await Product.findById(id);

        if (!product) {
            return res.send("Product not found");
        }
        res.render("show.ejs", { product });
    }

    catch (err) {
        console.log(err);
        res.send("Something went wrong");
    }

});

app.listen(8080, () => {
    console.log("server is listening to port :8080");
});