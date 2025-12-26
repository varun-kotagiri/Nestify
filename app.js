const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");

// Register ejs-mate as the template engine BEFORE setting view engine
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/Nestify");
}

const port = 8080;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get("/", (req, res) => {
  res.send("Welcome to Nestify");
});

const validateListing = (req, res, next) => { 
  const { error } = listingSchema.validate(req.body);
  if (error) {
    let errorMessage = error.details.map(el => el.message).join(", ");
    throw new ExpressError(400,errorMessage);
  } else {
    next();
  }   
};

// Index Route to display all listings
app.get("/listings", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

// New Route to show form to create a new listing
app.get("/listings/new", (req, res) => {
  res.render("listings/new");
});

// Show Route to display a specific listing
app.get("/listings/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show", { listing });
}));

// Create Route to add a new listing
app.post("/listings", validateListing, wrapAsync(async (req, res) => {
  const { title, description, image, price, country, location } = req.body;
  const newListing = new Listing({ title, description, image, price, country, location });
  await newListing.save();
  res.redirect("/listings");
}));

// Edit Route to edit a listing
app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit", { listing });
}));

// Update Route to update a listing
app.put("/listings/:id", validateListing, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { title, description, image, price, country, location } = req.body;
  await Listing.findByIdAndUpdate(id, { title, description, image, price, country, location });
  res.redirect(`/listings/${id}`);
}));

// Delete Route to delete a listing
app.delete("/listings/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  res.redirect("/listings");
}));


app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err,req,res,next) => {
  let { status = 500, message="something went wrong" } = err;
  res.status(status).render("error.ejs",{message});
});