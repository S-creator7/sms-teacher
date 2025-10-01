const CustomInput = ({
  type = "text",
  name,
  label,
  placeholder,
  register,
  required,
  disabled,
  readOnly,
  error,
  options = [],
  accept,
  rows = 4,
  min,
  max,
  onInput,
  value,
  defaultValue,
  onChange,
}) => {
  const baseClass =
    "w-full px-5 py-2 border rounded-lg focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400";

  const registerProps = register && name ? register(name) : {};

  const commonProps = {
    ...registerProps,
    placeholder,
    disabled,
    readOnly,
    className: `${baseClass} ${
      disabled
        ? "border-gray-300 text-gray-600 bg-gray-100 cursor-not-allowed"
        : "border-gray-400"
    }`,
    min,
    max,
    onInput,
    value,
    defaultValue,
    onChange,
  };

  return (
    <div className="w-full relative h-fit">
      {label && (
        <label className="block font-medium mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea {...commonProps} rows={rows}></textarea>
      ) : type === "select" ? (
        <select {...commonProps}>
          <option value="">Select</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "file" ? (
        <input
          type="file"
          {...commonProps}
          accept={accept}
          className="w-full border border-gray-300 rounded px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
        />
      ) : (
        <input type={type} {...commonProps} />
      )}

      {error && (
        <p className="text-red-500 text-xs py-[2px] px-1 bg-white absolute -bottom-2 ml-2">
          {error.message || error}
        </p>
      )}
    </div>
  );
};

export default CustomInput;