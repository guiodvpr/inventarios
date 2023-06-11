//include express module or package
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const jwt = require('jsonwebtoken');
//create instance of express
const app = express();
const port = process.env.PORT || 4000;
app.get('/', (req, res) => res.send('Hello World!'));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const mongourl = 'mongodb+srv://leon:upKBLprHgHxsJNB1@cluster0.9iiutan.mongodb.net/inventarios';//Deberia estar en archivo .env pero para facilidad de evaluacion se dejo aca
const SECRET = '123456';//Deberia estar en archivo .env pero para facilidad de evaluacion se dejo aca

//connect to mongodb
mongoose.connect(mongourl, { useNewUrlParser: true });
//create schema
const userSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: String,
    password: String,
    salt: String,
    role: String
});

const productosSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    price: Number,
    stock: Number,
    image: String
});

const empresaSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
    phone: String,
    nit: String,
    productos: [productosSchema]
});

const User = mongoose.model('User', userSchema);
const Empresa = mongoose.model('Empresa', empresaSchema);
const Productos = mongoose.model('Productos', productosSchema);

function auth(role){
    role = role=="admin"?"a":"e";
    return (req, res, next) => {
        const token = req.headers['authorization'];
        console.log(token)
        if(token == null){
            return res.sendStatus(401);
        }
        else{
            jwt.verify(token, SECRET, (err, user) => {
                if(err){
                    console.log(err)
                    return res.sendStatus(403);
                }
                else{
                    User.findOne({_id: user.id}).then((user) => {
                        if(user.role == role){
                            next();
                        }else{
                            return res.sendStatus(403);
                        }
                    }).catch((err) => {
                        console.log(err)
                        return res.sendStatus(403);
                    });
                }
            });
        }
    }
}


//create empresa
app.put('/empresa',auth("admin"), (req, res) => {
    const empresa = new Empresa({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        nit: req.body.nit,
        productos: []
    });
    empresa.save().then(() => {
        console.log('Empresa created')
        res.send('Empresa created')
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    });
});

//create productos
app.put('/producto',auth("admin"), (req, res) => {
    const productos = new Productos({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        stock: req.body.stock,
        image: req.body.image
    });

    Empresa.findOne({_id: '6483a3cb7e63e8b072f11085'}).then(empresa => {
        if(empresa == null){
            console.log('Empresa not found')
            // res.status(404).send('Error')
        }else{
            empresa.productos.push(productos);
            empresa.save();
            console.log('Producto created')
            // res.send('Producto created')
        }
    }).catch((err) =>{
        console.log(err)
        // res.status(500).send('Error')
    });
});

//get all empresas
app.get('/empresas',auth("ext"), (req, res) => {
    Empresa.find({},{_id:1,name:1}).then((empresas) => {
        res.send(empresas)
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    });
});

//get single empresa
app.get('/empresa/:id',auth("ext"), (req, res) => {
    Empresa.findOne({_id: req.params.id}).then((empresa) => {
        res.send(empresa)
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    });
});

//delete empresa
app.delete('/empresa/:id',auth("admin"), (req, res) => {
    Empresa.deleteOne({_id: req.params.id}).then(() => {
        console.log('Empresa deleted')
        res.send('Empresa deleted')
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    }
    );
});

//update empresa
app.post('/empresa/:id',auth("admin"), (req, res) => {
    Empresa.updateOne({_id: req.params.id}, {name: req.body.name, address: req.body.address, phone: req.body.phone, nit: req.body.nit}).then(() => {
        console.log('Empresa updated')
        res.send('Empresa updated')
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    }
    );
});

//update producto
app.post('/producto/:id',auth("admin"), (req, res) => {
    Productos.updateOne({_id: req.params.id}, {name: req.body.name, description: req.body.description, price: req.body.price, stock: req.body.stock, image: req.body.image}).then(() => {
        console.log('Producto updated')
        res.send('Producto updated')
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    }
    );
});

//delete producto
app.delete('/producto/:id',auth("admin"), (req, res) => {
    Productos.deleteOne({_id: req.params.id}).then(() => {
        console.log('Producto deleted')
        res.send('Producto deleted')
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    }
    );
});

function generatePDF(id){
    //get empresa data
    Empresa.findOne({_id: id}).then((empresa) => {
        // console.log(empresa)

        //create pdf
        var doc = new PDFDocument();
        doc.pipe(fs.createWriteStream("public/reports/"+id+'_reporte.pdf'));
        doc.fontSize(25).text('Reporte de empresa', 100, 100);
        doc.fontSize(15).text('Nombre: '+empresa.name, 100, 150);
        doc.fontSize(15).text('Direccion: '+empresa.address, 100, 170);
        doc.fontSize(15).text('Telefono: '+empresa.phone, 100, 190);
        doc.fontSize(15).text('Nit: '+empresa.nit, 100, 210);
        doc.fontSize(15).text('Productos: ', 100, 230);
        var y = 250;
        empresa.productos.forEach(producto => {
            doc.fontSize(15).text('Nombre: '+producto.name, 150, y);
            doc.fontSize(15).text('Descripcion: '+producto.description, 150, y+20);
            doc.fontSize(15).text('Precio: '+producto.price, 150, y+40);
            doc.fontSize(15).text('Stock: '+producto.stock, 150, y+60);
            y = y + 80;
        }
        );
        doc.end();
    }).catch((err) =>{
        console.log(err)
    }
    );
}

//send report email
app.post('/correo/:id',auth("admin"), (req, res) => {
    console.log("envio de email de reporte en desarrollo")
    res.send("envio de email de reporte en desarrollo")
});

//get report email
app.get('/reporte/:id',auth("admin"), (req, res) => {
    generatePDF(req.params.id)
    res.send("Reporte generado")
});

//auth user
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({username: username}).then((user) => {
        if(user == null){
            console.log('User not found')
            res.status(404).send('Error')
        }else{
            const hashedPassword = bcrypt.hashSync(password, user.salt);
            if(user.password == hashedPassword){
                console.log('User logged')
                //issue token
                const payload = {id: user._id, role: user.role};
                const token = jwt.sign(payload, SECRET, {expiresIn: '1d'});
                res.cookie('token', token, {httpOnly: true}).send(token);
            }else{
                console.log('Incorrect password')
                res.status(401).send('Error')
            }
        }
    }).catch((err) =>{
        console.log(err)
        res.status(500).send('Error')
    });
});

//logout user
app.post('/logout', (req, res) => {
    res.clearCookie('token').send('User logged out')
});

//static folder
app.use(express.static('public'));

app.listen(port, () => console.log('Listening on port 4000!'));