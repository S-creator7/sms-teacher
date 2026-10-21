import { useEffect, useState } from "react";
import { createTeacherTicket, getTeacherTicketCategories } from "../../Utility/ticketApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuArrowLeft } from "react-icons/lu";

export default function TicketCreate() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);

    const [form, setForm] = useState({
        title: "",
        description: "",
        category_id: "",
        priority: "Low",
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const res = await getTeacherTicketCategories();
        if (res.status) {
            setCategories(res.resources.data.categories);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await createTeacherTicket(form);

        if (res.status) {
            toast.success("Ticket created successfully!");
            navigate("/tickets");
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">

            {/* Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                >
                    <LuArrowLeft size={22} />
                </button>
                <h1 className="text-2xl font-bold">Create Ticket</h1>
            </div>

            <form className="space-y-4 bg-white w-full p-5 rounded-xl shadow-md mt-6 border border-gray-200" onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Title"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 focus:outline-none"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <textarea
                    placeholder="Description"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 focus:outline-none"
                    rows="4"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <select
                    className="w-full border border-gray-300 p-3 rounded-lg focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 focus:outline-none"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                            {c.category_name}
                        </option>
                    ))}
                </select>

                <select
                    className="w-full border border-gray-300 p-3 rounded-lg focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 focus:outline-none"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>

                <button
                    className="bg-[#f86730] text-white px-4 py-3 rounded-lg w-full font-semibold hover:bg-[#e35d1f] transition duration-200"
                    type="submit"
                >
                    Submit Ticket
                </button>
            </form>
        </div>
    );
}
