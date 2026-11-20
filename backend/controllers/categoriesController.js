const Category = require('../models/Category');

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const trimmedName = name.trim();
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }

        const newCategory = new Category({ name: trimmedName });
        await newCategory.save();

        res.status(201).json(newCategory);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error while creating category' });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const trimmedName = name.trim();
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (trimmedName.toLowerCase() !== category.name.toLowerCase()) {
            const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
            if (existingCategory) {
                return res.status(400).json({ message: 'Another category with this name already exists' });
            }
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: trimmedName },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Server error while updating category' });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Server error while deleting category' });
    }
};
