import express from "express";
import routes from "server/routes"; // 👈 match your folder
import fileUpload from "express-fileupload";

const app = express();
const port = process.env.PORT || 3000;

app.use(fileUpload()); // ✅ only this, no multer needed
app.use(express.json());

app.use("/api", routes);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
