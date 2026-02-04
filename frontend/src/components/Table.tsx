import { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  title: string;
  render?: (value: any, record: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  striped?: boolean;
  hoverable?: boolean;
  responsive?: boolean;
  caption?: string;
  onRowClick?: (record: T) => void;
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  striped = true,
  hoverable = true,
  responsive = true,
  caption,
  onRowClick
}: TableProps<T>) => {
  const tableClasses = `
    min-w-full divide-y divide-gray-200
    ${striped ? 'divide-y' : ''}
  `;

  const rowClasses = `
    ${hoverable ? 'hover:bg-gray-50' : ''}
    ${onRowClick ? 'cursor-pointer' : ''}
  `;

  const responsiveWrapper = responsive ? (
    <div className="overflow-x-auto">
      <InnerTable />
    </div>
  ) : (
    <InnerTable />
  );

  function InnerTable() {
    return (
      <table className={tableClasses}>
        {caption && (
          <caption className="sr-only">
            {caption}
          </caption>
        )}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr
              key={index}
              className={`${rowClasses} ${striped && index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              onClick={() => onRowClick && onRowClick(record)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${column.className || ''}`}
                >
                  {column.render
                    ? column.render(record[column.key], record)
                    : record[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return responsiveWrapper;
};

export default Table;