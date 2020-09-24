const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const path = require('path');
const sharp = require('sharp')

// Algolia
const mongooseAlgolia = require('mongoose-algolia');
const algoliasearch = require('algoliasearch');
const client = algoliasearch("2J6ZG5DUIZ", "17a8ad13cbc6553b47757da33f5b3fe0");



//upload image
const multer = require('multer');
//const { default: algoliasearch } = require('algoliasearch');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },

    filename: function (req, file, cb) {

        //console.log(file)

        const ext = path.extname(file.originalname);
        const date = Date.now();

        cb(null, date + '-' + file.originalname)
        //cb(null, file.originalName + '-' + Date.now() + ext)
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1 * 3000 * 3000,
        // pour les dimentions mettre ce que l'on veut
        files: 1
    },
    fileFilter: function (req, file, cb) {
        /* => Pour le filtrage des images*/
        if (
            file.mimetype === "image/png" ||
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/gif"
        ) {
            cb(null, true)
        } else
            cb(new Error('Le fichier doit être au format png, jpeg ou gif.'))
    }

})

//express
const port = process.env.PORT || 7777;
const app = express();


//express static
app.use(express.static("public"))

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
// Indiquer ici ce qui se trouvera dans la base de connées.
const productSchema = new mongoose.Schema({
    title: String,
    content: String,
    price: Number,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"
    },

    cover: {
        name: String,
        originalName: String,
        path: String,
        urlSharp: String,
        createAt: Date
    }
});

const categorySchema = new mongoose.Schema({
    title: String
})

//Aller sur le site officiel d'Algolia pour récupérer les infos après création du compte et de l'index.
productSchema.plugin(mongooseAlgolia, {
    appId: "2J6ZG5DUIZ",
    apiKey: "17a8ad13cbc6553b47757da33f5b3fe0",
    indexName: 'products', //The name of the index in Algolia, you can also pass in a function
    selector: 'title category', //You can decide which field that are getting synced to Algolia (same as selector in mongoose)
    populate: {
        path: 'category',
        select: 'title',
    },
    defaults: {
        author: 'unknown',
    },
    mappings: {
        title: function (value) {
            return value
        },
    },
    virtuals: {
        whatever: function (doc) {
            return `Custom data ${doc.title}`
        },
    },

    debug: true, // Default: false -> If true operations are logged out in your console
})


const Product = mongoose.model("product", productSchema)
const Category = mongoose.model("category", categorySchema)

//Routes
app.route("/search")
    .get((req, res) => {


        if (req.query.q) {
            //console.log(req.query.q);
            let queries = [{
                indexName: "products",
                query: req.query.q,
                params: {
                    hitsPerPage: 8 //Nombre de résultats
                }
            }]
            client.search(queries, function (err, data) {
                //console.log(data.results(0));

                res.locals.search_results = data.results && data.results[0] && data.results[0].hits ? data.results[0].hits : [] //"hits" = cible.
                res.render("search")
            });
        } else {
            res.render("search")
        }

    })



app.route("/category")
    .get((req, res) => {
        Category.find((err, category) => {
            if (!err) {
                res.render("category", {
                    categorie: category
                })
            } else {
                res.send(err)
            }
        })
    })

    .post((req, res) => {
        const newCategory = new Category({
            title: req.body.title
        })

        newCategory.save(function (err) {
            if (!err) {
                res.send("save ok !")
            } else {
                res.send(err)
            }
        })
    })

//===========================================//

app.route("/")
    .get((req, res) => {

        Product
            .find()
            .populate("category")
            .exec(function (err, produit) {
                if (!err) {
                    Category.find(function (err, category) {
                        console.log(produit)
                        console.log(category)
                        res.render("index", {
                            Product: produit,
                            Category: category
                        })
                    })
                } else {
                    res.send(err)
                }

            })
    })

    .post(upload.single("cover"), (req, res) => {
        const file = req.file;
        console.log(file);

        console.log(req.body)

        sharp(file.path)
            .resize(200)
            .webp({
                quality: 80
            }) // => "webp", format google
            //.rotate(90)
            .toFile('./public/uploads/web' + file.originalname.split('-').slice(0, -1).join('-') + ".webp", (err, info) => {});


        const newProduct = new Product({
            title: req.body.title,
            content: req.body.content,
            price: req.body.price,
            category: req.body.category

        });

        if (file) {
            newProduct.cover = {
                name: file.filename,
                originalname: file.originalname,
                //path:"uploads/" + filename
                path: file.path.replace("public", ""),
                urlSharp: '/uploads/web' + file.originalname.split('-').slice(0, -1).join('-') + ".webp",
                createAt: Date.now()
            }
        }



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

app.listen(port, function () {
    console.log(`écoute le port ${port}, lancé à : ${new Date().toLocaleString()}`);
})