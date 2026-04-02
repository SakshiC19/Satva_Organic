import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalResults, 
  itemsPerPage 
}) => {
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalResults);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <span>{startIdx}</span> to <span>{endIdx}</span> of <span>{totalResults}</span> entries
      </div>
      
      <div className="pagination-controls">
        <button 
          className="pagination-btn prev" 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FiChevronLeft />
        </button>
        
        <div className="pagination-pages">
          {getPageNumbers()[0] > 1 && (
            <>
              <button 
                className={`pagination-page-btn ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => onPageChange(1)}
              >
                1
              </button>
              {getPageNumbers()[0] > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}
          
          {getPageNumbers().map(page => (
            <button 
              key={page}
              className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}
          
          {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                <span className="pagination-ellipsis">...</span>
              )}
              <button 
                className={`pagination-page-btn ${currentPage === totalPages ? 'active' : ''}`}
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        
        <button 
          className="pagination-btn next" 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
