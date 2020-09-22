const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override')

const app = express();

//methode-override => pour la mise à jour.
app.use(methodOverride("_method"));

//Handlebars
/*"engine = moteur", interprète et exécute du code en langage JavaScript*/
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: 'hbs'
}));
app.set('view engine', 'hbs')


//BodyParser
app.use(bodyParser.urlencoded({
    /*=> "urlencoded", on passe les données dans l'url*/
    extended: true
}));


//MongoDB
mongoose.connect("mongodb://localhost:27017/boutiqueGame", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
// Model
const productSchema = {
    title: String,
    content: String,
    price: Number
};

const Product = mongoose.model("product", productSchema)

//Routes
app.route("/")
    .get((req, res) => {
        //MyModel.find({ name: 'john', age: { $gte: 18 }}, function (err, docs) {});
        Product.find(function (err, produit) {
            if (!err) {
                console.log(produit)
                res.render("index", {
                    Product: produit
                })
            } else {
                res.send(err)
            }

        })
    })

    .post((req, res) => {
        const newProduct = new Product({
            title: req.body.title,
            content: req.body.content,
            price: req.body.price

        })
        newProduct.save(function (err) {
            if (!err) {
                res.send("save ok !")

            } else {
                res.send(err)
            }
        })
    })

    .delete(function (req, res) {
        /*pour supprimer toutes les variables*/
        Product.deleteMany(function (err) {
            if (!err) {
                res.send("All delete")
            } else {
                res.send(err)
            }
        })
    })


// route édition
app.route("/:id")
    .get(function (req, res) {
        Product.findOne({
                _id: req.params.id /*=> "params = paramètres du reste"*/
            },
            function (err, produit) {
                if (!err) {
                    res.render("edition", {
                        _id: produit.id,
                        title: produit.title,
                        content: produit.content,
                        price: produit.price
                    })
                }
            }
        )
    })

    .put(function (req, res) {
        Product.update(
            //condition
            {
                _id: req.params.id
            },
            //update
            {
                title: req.body.title,
                content: req.body.content,
                price: req.body.price
            },
            //option
            {
                multi: true
            }, /*pour faire plusieurs modif en même temps*/
            //executer la fonction
            function (err) {
                if (!err) {
                    res.send("update ok !")
                } else {
                    res.send(err)
                }
            }
        )
    })

    .delete(function (req, res) {
        /*pour supprimer 1 seule variable, en fonction de son id*/
        Product.deleteOne({
                _id: req.params.id 
            },
            function (err) {
                if (!err) {
                    res.send("product delete")
                } else {
                    res.send(err)
                }
            }
        )
    })

app.listen(4000, function () {
    console.log('écoute le port 4000');
})