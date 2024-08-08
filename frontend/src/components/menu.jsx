export const MenuComp = ({ children, options, data, isPending }) => {
  return (
    <div className="dropdown dropdown-end dropdown-bottom">
      <div
        tabIndex={0}
        role="button"
        onClick={(e) => e.stopPropagation()}
        className="btn btn-sm m-1 h-fit p-1"
      >
        <div>{children}</div>
      </div>
      <div
        tabIndex={0}
        className="menu dropdown-content z-[1] max-w-fit min-w-40 rounded-box bg-base-100 p-2 shadow"
      >
        {options?.map(({ label, onClick }, index) => (
          <button
            className="btn btn-ghost btn-sm h-fit whitespace-nowrap justify-start py-3"
            key={index}
            disabled={isPending}
            onClick={() => onClick({ value: data })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
