const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const saltRounds = 10;
var jwt = require("jsonwebtoken");
var secrat = "max1688x";
require('dotenv').config()

app.use(cors());
app.use(express.json());


// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "maxnorawit"
// })

const db = mysql.createConnection(process.env.DATABASE_URL);
 

app.get("/app/product", (req, res) => {
  db.query("SELECT id,img,price,product FROM product WHERE username = '0'", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.json(result);
    }
  });
});

app.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secrat);
    db.query(
      "SELECT * FROM users WHERE username = ?",
      decoded.username,
      (err, result) => {  
        if (err) {
          console.log(err);
        } else {
          res.json({ status: "success", message: result[0] });
        }
      }
    );
  } catch (err) {
    return res.status(401).json({ status: "jwt", message: err.message });
  }
});

app.get("/history", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secrat);
    db.query("SELECT img,price,product,ans,timeout FROM product WHERE username = ? ORDER BY timeout DESC",decoded.username, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json(result);
      }
    });
  } catch (err) {
    return res.status(401).json({ status: "jwt", message: err.message });
  }
});

app.get("/buy/:id", async (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM product WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      if (result.length == 0) {
        return res
          .status(401)
          .json({ status: "error", message: "ไม่มีสินค้านี้" });
      } else {
        if (result[0].username != "0") {
          return res
            .status(401)
            .json({ status: "error", message: "สินค้านี้ขายแล้ว" });
        } else {
          try {
            const token = req.headers.authorization.split(" ")[1];
            var decoded = jwt.verify(token, secrat);
            db.query(
              "SELECT * FROM users WHERE username = ?",
              decoded.username,
              (erruser, resultuser) => {
                if (resultuser[0].point < result[0].price) {
                  return res
                    .status(401)
                    .json({ status: "error", message: "ยอดเงินไม่เพียงพอ" });
                } else {
                  const updatepoint = `UPDATE users SET point = point-${result[0].price} WHERE username = '${decoded.username}'`;
                  db.query(updatepoint, (errsetpoint, resultsetpoint) => {
                    if (errsetpoint) {
                      return res
                        .status(401)
                        .json({ status: "error", message: errsetpoint });
                    } else {
                      const setowner = `UPDATE product SET username = '${decoded.username}', timeout = CURRENT_TIMESTAMP WHERE id = '${result[0].id}'`;
                      db.query(setowner, (errsetowner, resultsetowner) => {
                        if (errsetowner) {
                          return res
                            .status(401)
                            .json({ status: "error", message: errsetowner });
                        } else {
                          return res.status(200).json({
                            status: "success",
                            message: "ซื้อสินค้าสำเร็จ",
                          });
                        }
                      });
                    }
                  });
                }
              }
            );
          } catch (err) {
            return res
              .status(401)
              .json({ status: "jwt", message: err.message });
          }
        }
      }
    }
  });
});

app.get("/delet/:id", async (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM product WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      return res.status(200).json({
        status: "success",
        message: "ลบสินค้า",
      });      
    }
  });
});

app.post("/register", async (req, res) => {
  const username = req.body.user;
  const password = req.body.password;
  const password2 = req.body.password2;
  const email = req.body.email;

  if (username.length == 0) {
    return res
      .status(401)
      .json({ status: "error", message: "กรุณากรอกชื่อผู้ใช้" });
  } else if (password.length == 0) {
    return res
      .status(401)
      .json({ status: "error", message: "กรุณากรอกรหัสผ่าน" });
  } else if (email.length == 0) {
    return res
      .status(401)
      .json({ status: "error", message: "กรุณากรอก Email" });
  } else if (password2.length == 0) {
    return res
      .status(401)
      .json({ status: "error", message: "กรุณากรอกยืนยันรหัสผ่าน" });
  } else if (password != password2) {
    return res
      .status(401)
      .json({ status: "error", message: "รหัสผ่านไม่ตรงกัน" });
  } else {
    db.query(
      "SELECT * FROM users WHERE username = ?",
      username,
      (err, result) => {
        if (err) {
          res.status(401).json({ status: "error", message: err });
        } else {
          if (result.length == 0) {
            bcrypt.hash(password, saltRounds, function (err, hash) {
              db.query(
                "INSERT INTO users (username, password, email) VALUES (?,?,?)",
                [username, hash, email],
                (err, result) => {
                  if (err) {
                    return res
                      .status(401)
                      .json({ status: "error", message: err });
                  } else {
                    return res.status(200).json({
                      status: "success",
                      message: "สมัครสมาชิกสำเร็จ",
                    });
                  }
                }
              );
            });
          } else {
            return res
              .status(401)
              .json({ status: "error", message: "มีผู้ใช้นี้อยู่ในระบบแล้ว" });
          }
        }
      }
    );
  }
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    username,
    (err, result) => {
      if (err) {
        return res.status(401).json({ status: "error", message: err });
      } else {
        if (result.length == 0) {
          return res
            .status(401)
            .json({ status: "error", message: "ชื่อผู้ใช้ไม่ถูกต้อง" });
        } else {
          bcrypt.compare(
            password,
            result[0].password,
            function (err, resultbcrypt) {
              if (resultbcrypt) {
                var token = jwt.sign({ username: result[0].username }, secrat, {
                  expiresIn: "1h",
                });
                return res.status(200).json({
                  status: "success",
                  message: "เข้าสู่ระบบสำเร็จ",
                  token,
                });
              } else {
                return res
                  .status(401)
                  .json({ status: "error", message: "รหัสผ่านไม่ถูกต้อง" });
              }
            }
          );
        }
      }
    }
  );
});

app.post("/auth", (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secrat);
    res.status(200).json({ status: "success", message: decoded });
  } catch (err) {
    res.status(401).json({ status: "error", message: err.message });
  }
});

app.post("/auth", (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secrat);
    res.status(200).json({ status: "success", message: decoded });
  } catch (err) {
    res.status(401).json({ status: "error", message: err.message });
  }
});


app.post("/addproduct", async (req, res) => {

  const product = req.body.product;
  const img = req.body.img;
  const price = req.body.price;
  const detial = req.body.detial;

  if(!product || !img || !price || !detial){
    return res.status(401).json({ status: "error", message: "กรุณากรอกข้อมูลให้ครบ" });
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secrat);
    db.query(
      "SELECT * FROM users WHERE username = ?",
      decoded.username,
      (err, result) => {
        if(result[0].rank === 1){
          db.query(
            "INSERT INTO product (product, img, price, ans) VALUES (?,?,?,?)",
            [product, img, price, detial],
            (err, result) => {
              if (err) {
                return res
                  .status(401)
                  .json({ status: "error", message: err });
              } else {
                return res.status(200).json({
                  status: "success",
                  message: "เพิ่มสินค้าสำเร็จ",
                });
              }
            }
          );          
        }else{
          return res.status(401).json({ status: "error", message: "คุณไม่มีสิทข้าถึงหน้านี้" });
        }
      }
    );
  } catch (err) {
    return res.status(401).json({ status: "jwt", message: err.message });
  }
});

app.listen(3001, () => {
  console.log("Yey, your server is running on port 3001");
});
