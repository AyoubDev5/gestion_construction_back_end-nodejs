const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("./db");
const multer = require("multer");
const path = require("path");
const nodemailer = require('nodemailer');
const twilio = require("twilio");

require('dotenv').config();

app.use(cors());
app.use(express.json()); //req.body
app.use(bodyParser.urlencoded({ extended: true }));

// Init app
const accountSid = "ACc3fe5045eff3380f4d98d22c65c48786"; 
const authToken = "c0ca80403b90014d704000c67f5c79a1"; 
const client = new twilio(accountSid, authToken); 

const port = process.env.PORT || 5000;
pool.connect((error) => {
  if (error) throw error;
  else console.log("DATABASE connected ON PORT 5432");
});
app.listen(port, () => {
  console.log("server has started on port "+ port);
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "__" + Date.now() + path.extname(file.originalname)
    );
  },
});
var upload = multer({ storage: storage });

//ROUTES//
app.get('/',(req,res)=>{
  res.send("welcome")
});
//create an empl
app.post("/empl", async (req, res) => {
  try {
    // const {  } = req.params;
    const {
      id_empl,
      cne,
      date_debut,
      date_fin,
      image,
      price,
      tele,
      fname,
      lname,
    } = req.body;
    const newEmpl = await pool.query(
      "INSERT INTO empl ( cne, date_debut, date_fin, image, price, tele, fname, lname) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [cne, date_debut, date_fin, image, price, tele, fname, lname]
    );

    res.json(newEmpl.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});
///////////////////////////////////////////////////////////////////////////
app.post("/addNewEmpl/:tache_id", upload.any(), (req, res) => {
  console.log("req.files", req.files);
  console.log("req.body", req.body);
  let image = [];
  req.files.map((item) => {
    image.push(item.filename);
  });
  const { tache_id } = req.params;
  const { id_empl, cne, date_debut, date_fin, price, tele } = req.body;
  pool.query(
    "INSERT INTO articles (id_empl, cne, date_debut, date_fin, image, price, tele, fname, lname) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [
      id_empl,
      cne,
      date_debut,
      date_fin,
      image,
      price,
      tele,
      fname,
      lname,
      tache_id,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log("result", result);
        res.send(result);
      }
    }
  );
});

//get all empl
app.get("/empls", async (req, res) => {
  try {
    const allEmpls = await pool.query("SELECT * FROM empl");
    res.json(allEmpls.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//get an empl
app.get("/empl/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const empl = await pool.query("SELECT * FROM empl WHERE id_empl = $1", [
      id,
    ]);
    res.json(empl.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

//update a empl
app.put("/empls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { date_debut, date_fin, image, price, tele } = req.body;
    const updateEmpl = await pool.query(
      "UPDATE empl SET date_debut=$1, date_fin=$2, image=$3, price=$4, tele=$5 WHERE id_empl=$6;",
      [date_debut, date_fin, image, price, tele, id]
    );
    // res.json("Empl was updated!");
    res.json(updateEmpl.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.put("/employee/:id", (req, res) => {
  const empl = req.body;
  console.log(empl);
  const sql =
    "UPDATE empl SET cne=?, lname=?, fname=?, date_debut=?, date_fin=?, image=?, price=?, tele=?, gmail=? WHERE id_empl=" +
    req.params.id +
    ";";
  pool.query(
    sql,
    [
      empl.cne,
      empl.lname,
      empl.fname,
      empl.date_debut,
      empl.date_fin,
      empl.image,
      empl.price,
      empl.tele,
      empl.gmail,
    ],
    (err, rows, fields) => {
      if (!err) res.send("is Updated");
      else console.log(err);
    }
  );
});

//delete a empl
app.delete("/deleteEmpls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteEmpl = await pool.query("DELETE FROM empl WHERE id_empl = $1", [
      id,
    ]);
    res.json("empl was deleted!");
  } catch (err) {
    console.log(err.message);
  }
});

//get projects and taches by order
app.get("/projet", (req, res) => {
  pool.query("SELECT * FROM projet ORDER BY id_projet DESC", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
app.get("/taches", (req, res) => {
  pool.query("SELECT * FROM tache ORDER BY id_taches DESC", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get('/alltaches/projet/:id',(req,res)=>{
  let sql='select t.description_tache,p.nom_projet,t.nouveau_prix from projet p,tache t where p.id_projet=t.projet_id and p.id_projet='+req.params.id;
  pool.query(sql,(err,rows,fields)=>{
      if(err){
          console.log(err);
      }
      else{
          res.send(rows);
      }
  });
});

app.get("/tacheSum/:id_projet", async (req, res) => {
  try {
    const { id_projet } = req.params;
    const tache = await pool.query("SELECT SUM(nouveau_prix) FROM tache WHERE projet_id = $1", [
      id_projet,
    ]);
    res.send(tache.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/tache/:id_projet", async (req, res) => {
  try {
    const { id_projet } = req.params;
    const tache = await pool.query("SELECT * FROM tache WHERE projet_id = $1", [
      id_projet,
    ]);
    res.json(tache.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//get materials items:
app.get("/materiels", (req, res) => {
  pool.query("SELECT * FROM materiel", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});
//delete materiel item by id:
app.delete("/deleteMateriel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteEmpl = await pool.query(
      "DELETE FROM materiel WHERE id_materiel = $1",
      [id]
    );
    res.json("materiel was deleted!");
  } catch (err) {
    console.log(err.message);
  }
});

//Home Tache by ID
//1-get empls by id_tache:
app.get("/empls/:id_tache", async (req, res) => {
  try {
    const { id_tache } = req.params;
    const tache = await pool.query("SELECT * FROM empl WHERE tache_id = $1", [
      id_tache,
    ]);
    res.json(tache.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//2-get materiels by id_tache:
app.get("/materiels/:id_tache", async (req, res) => {
  try {
    const { id_tache } = req.params;
    const tache = await pool.query(
      "SELECT * FROM materiel WHERE tache_id = $1",
      [id_tache]
    );
    res.json(tache.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//get le prix d'une tache by id : tache et projet
app.get("/prixTache/:id_projet/:id_tache", async (req, res) => {
  try {
    const { id_projet, id_tache } = req.params;
    const prix = await pool.query(
      "select sum(nouveau_prix) from tache where id_taches=$2 and projet_id=$1;",
      [id_projet, id_tache]
    );
    res.send(prix.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//get salaire d'une tache by id : tache
app.get("/prixMaterial/:id_projet/:id_tache", async (req, res) => {
  try {
    const { id_projet, id_tache } = req.params;
    const sal = await pool.query(
      "select sum(prix_unitaire * quantite) from materiel, tache, projet where materiel.tache_id = tache.id_taches and tache.projet_id = projet.id_projet and id_taches = $2 and projet_id = $1;",
      [id_projet, id_tache]
    );
    res.send(sal.rows);
  } catch (err) {
    console.error(err.message);
  }
});
//get salaire d'une tache by id : tache
app.get("/salEmpl/:id_projet/:id_tache", async (req, res) => {
  try {
    const { id_projet, id_tache } = req.params;
    const sal = await pool.query(
      "select sum(price) from empl, tache, projet where empl.tache_id = tache.id_taches and tache.projet_id = projet.id_projet and id_taches = $2 and projet_id = $1;",
      [id_projet, id_tache]
    );
    res.send(sal.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//get all materials list :
app.get("/material_list", async (req, res) => {
  try {
    const material_list = await pool.query("SELECT * FROM materiel_list ");
    res.json(material_list.rows);
  } catch (err) {
    console.error(err.message);
  }
});

//get nodemailer
app.post('/email',(req,res)=>{
  const { email, text } = req.body;
  
  const trans = nodemailer.createTransport({
      service:'gmail',
      auth:{
          user:'ayoub.taqi@usmba.ac.ma',
          pass:'cbfhxjglgcabpoux'
      }
  })

  const option={
      from: 'ayoub.taqi@usmba.ac.ma',
      to: email,
      subject: 'message from '+ 'ayoub.taqi@usmba.ac.ma',
      text: text
  }
  trans.sendMail(option, (error, body) => {
      if (error) {
        console.log(error);
        res.status(500).send({ message: 'Error in sending email' });
      } else {
        console.log(body);
        res.send({ message: 'Email sent successfully'});
      }
    }
  );
});

  // Catch form submit
app.post('/sms', (req, res) => {
  const { number, text } = req.body;

  client.messages 
      .create({ 
         body: text,  
         messagingServiceSid: "MG0b532344f1aca1f5c02e047f17b88af3",      
         to: "+212"+number ,
         from: "+17407594109"
       }) 
      .then(message => 
        console.log("success")
      )
      .catch(err => console.log(err))
      .done();
});
