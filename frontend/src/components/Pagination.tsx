import React from 'react';
import { PaginationInfo } from '../interface';

interface PaginationProps {
    pagination: PaginationInfo;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
    const { page, totalPages, total, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <p className="text-sm text-slate-600">
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{total}</span> results
            </p>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>

                {getPageNumbers().map((p, index) => (
                    <button
                        key={index}
                        onClick={() => typeof p === 'number' && onPageChange(p)}
                        disabled={p === '...'}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page
                                ? 'bg-primary-600 text-white'
                                : p === '...'
                                    ? 'cursor-default text-slate-400'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
};
