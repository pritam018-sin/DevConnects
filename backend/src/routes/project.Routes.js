import { Router } from "express";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.Middlewares.js";
import { upload } from "../middlewares/mullter.Middlerware.js";
import {
    createProject,
    deleteProject,
    getAllProjects,
    getProjectById,
    getProjectByUsername,
    updateProject
} from "../controllers/project.Controller.js";

const router = Router();

router.route("/create-project").post(verifyJWT, upload.single("thumbnail"), createProject);
router.route("/all-projects").get(optionalVerifyJWT, getAllProjects);
router.route("/user/:username").get(optionalVerifyJWT, getProjectByUsername);
router.route("/:projectId").get(optionalVerifyJWT, getProjectById);
router.route("/update-project/:projectId").put(verifyJWT, upload.single("thumbnail"), updateProject);
router.route("/delete-project/:projectId").delete(verifyJWT, deleteProject);


export default router;
