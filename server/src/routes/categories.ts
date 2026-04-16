import { Router } from 'express';
import { prisma } from '../db.js';
import { requireStaff } from '../middleware/requireStaff.js';

const router = Router();

// GET /api/categories - list all categories (public)
router.get("/", async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true, },
        });
        res.json(categories);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Could not fetch categories" });
    }
});

// POST /api/categories - create category (admin only)
router.post("/", requireStaff, async (req, res) => {
    try {
        const { name, description } = req.body;

        //Validation
        if (!name || typeof name !== "string") {
            res.status(400).json({ error: "Name is required and must be a string" });
            return;
        }

        //Generate slug from name
        const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

        // Create category
        const category = await prisma.category.create({
            data: {
                name: name.trim(),
                slug,
                description: description ? description.trim() : null,
            },
        });

        res.status(201).json(category);
    } catch (e: any) {
    // Handle unique contraint violation
    if (e.code === "P2002") {
        res.status(409).json({ error: "Category with this name already exists" });
        return;
    }
        console.error(e);
        res.status(500).json({ error: "Could not create category" });
    }
});

// PUT /api/categories/:id - update category (admin only)
router.put("/:id", requireStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        //Check if category exists
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Category not found" });
            return;
        }

        //Validation
        if (name && typeof name !== "string") {
            res.status(400).json({ error: "Name must be a string" });
            return;
        }

        //Prepare data for update
        const updateData: any = {};
        if (name) {
            updateData.name = name.trim();
            updateData.slug = name.toLowerCase().trim().replace(/\s+/g, "-");
        }
        if (description !== undefined) {
            updateData.description = description ? description.trim() : null;
        }

        // Update category
        const category = await prisma.category.update({
            where: { id },
            data: updateData,
        });

        res.json(category);
    } catch (e: any) {
    // Handle unique contraint violation
    if (e.code === "P2002") {
        res.status(409).json({ error: "Category with this name already exists" });
        return;
    }
        console.error(e);
        res.status(500).json({ error: "Could not update category" });
    }
});

// DELETE /api/categories/:id - delete category (admin only)
router.delete("/:id", requireStaff, async (req, res) => {
    try {
        const { id } = req.params;

        //Check if category exists
        const existing = await prisma.category.findUnique({
            where: { id },
        });

        if (!existing) {
            res.status(404).json({ error: "Category not found" });
            return;
        }

        //Delete category
        await prisma.category.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Could not delete category" });
    }
});


export default router;