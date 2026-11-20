const College = require('../models/College');

// Get all colleges
exports.getColleges = async (req, res) => {
    try {
        const colleges = await College.find().sort({ sort_order: 1, name: 1 });
        res.status(200).json(colleges);
    } catch (error) {
        console.error('Error fetching colleges:', error);
        res.status(500).json({ message: 'Server error while fetching colleges' });
    }
};

// Create a new college
exports.createCollege = async (req, res) => {
    try {
        const { name, code, is_other, sort_order } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'College name is required' });
        }

        const trimmedName = name.trim();
        const existingCollege = await College.findOne({ name_lc: trimmedName.toLowerCase() });
        if (existingCollege) {
            return res.status(400).json({ message: 'College with this name already exists' });
        }

        const newCollege = new College({
            name: trimmedName,
            name_lc: trimmedName.toLowerCase(),
            code: code ? code.trim() : '',
            is_other: Boolean(is_other),
            sort_order: sort_order !== undefined ? Number(sort_order) : 1000,
            source: 'admin_dashboard'
        });

        await newCollege.save();
        res.status(201).json(newCollege);
    } catch (error) {
        console.error('Error creating college:', error);
        res.status(500).json({ message: 'Server error while creating college' });
    }
};

// Bulk create colleges
exports.createBulkColleges = async (req, res) => {
    try {
        const collegesToInsert = req.body;

        if (!Array.isArray(collegesToInsert) || collegesToInsert.length === 0) {
            return res.status(400).json({ message: 'A valid array of colleges is required' });
        }

        let insertedCount = 0;
        let skippedCount = 0;

        for (const c of collegesToInsert) {
            const trimmedName = c.name ? c.name.trim() : '';
            if (!trimmedName) {
                skippedCount++;
                continue;
            }

            const existingCollege = await College.findOne({ name_lc: trimmedName.toLowerCase() });
            if (existingCollege) {
                skippedCount++;
                continue;
            }

            const newCollege = new College({
                name: trimmedName,
                name_lc: trimmedName.toLowerCase(),
                code: c.code ? c.code.trim() : '',
                is_other: Boolean(c.is_other),
                sort_order: c.sort_order !== undefined ? Number(c.sort_order) : 1000,
                source: 'admin_dashboard'
            });

            await newCollege.save();
            insertedCount++;
        }

        res.status(201).json({ message: `Bulk upload complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}` });
    } catch (error) {
        console.error('Error in bulk creating colleges:', error);
        res.status(500).json({ message: 'Server error while bulk creating colleges' });
    }
};

// Update a college
exports.updateCollege = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, is_other, sort_order } = req.body;

        const college = await College.findById(id);
        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        const trimmedName = name ? name.trim() : college.name;
        if (name && trimmedName.toLowerCase() !== college.name_lc) {
            const existingCollege = await College.findOne({ name_lc: trimmedName.toLowerCase() });
            if (existingCollege) {
                return res.status(400).json({ message: 'Another college with this name already exists' });
            }
        }

        const updatedCollege = await College.findByIdAndUpdate(
            id,
            {
                name: trimmedName,
                name_lc: trimmedName.toLowerCase(),
                code: code !== undefined ? code.trim() : college.code,
                is_other: is_other !== undefined ? Boolean(is_other) : college.is_other,
                sort_order: sort_order !== undefined ? Number(sort_order) : college.sort_order
            },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedCollege);
    } catch (error) {
        console.error('Error updating college:', error);
        res.status(500).json({ message: 'Server error while updating college' });
    }
};

// Delete a college
exports.deleteCollege = async (req, res) => {
    try {
        const { id } = req.params;
        const college = await College.findByIdAndDelete(id);
        
        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        res.status(200).json({ message: 'College deleted successfully' });
    } catch (error) {
        console.error('Error deleting college:', error);
        res.status(500).json({ message: 'Server error while deleting college' });
    }
};

// Bulk delete colleges
exports.deleteBulkColleges = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'An array of college IDs is required' });
        }

        const result = await College.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ message: `Successfully deleted ${result.deletedCount} colleges` });
    } catch (error) {
        console.error('Error bulk deleting colleges:', error);
        res.status(500).json({ message: 'Server error while bulk deleting colleges' });
    }
};
