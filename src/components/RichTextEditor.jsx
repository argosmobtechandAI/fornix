import React, { useRef, useEffect, useState } from 'react';
import { 
  FiBold, FiItalic, FiUnderline, 
  FiList, FiRotateCcw, FiImage,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Custom, highly legible Ordered List Icon
const OrderedListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 6H4" />
    <path d="M4 14h2v2H4v2h2" />
  </svg>
);

const RichTextEditor = ({ value, onChange, label }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Format & Selection State
  const [currentBlockFormat, setCurrentBlockFormat] = useState('p');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageControlPosition, setImageControlPosition] = useState({ top: 0, left: 0 });

  // Update editor content when value changes externally (initial load)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // High-fidelity output propagation (strips temporary editing highlights)
  const handleInput = () => {
    if (editorRef.current) {
      const rawHtml = editorRef.current.innerHTML;
      
      // Parse DOM and strip temporary styles (outline, cursor) from standard output HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHtml;
      
      const images = tempDiv.getElementsByTagName('IMG');
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        img.style.removeProperty('outline');
        img.style.removeProperty('outline-offset');
        img.style.removeProperty('cursor');
        
        // Remove empty style attributes to keep output HTML clean
        if (img.getAttribute('style') === '') {
          img.removeAttribute('style');
        }
      }
      
      onChange(tempDiv.innerHTML);
    }
  };

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
    updateActiveFormat();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Helper to trace cursor/selection format block
  const updateActiveFormat = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    let node = selection.anchorNode;
    let format = 'p';
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'blockquote'].includes(tagName)) {
          format = tagName;
          break;
        }
      }
      node = node.parentNode;
    }
    
    setCurrentBlockFormat(format);
  };

  // Calculate coordinates for the floating image control popover
  const updateControlPosition = (img) => {
    if (!editorRef.current) return;
    const rect = img.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    
    // Position below the image centered horizontally
    let top = rect.bottom - editorRect.top + editorRef.current.scrollTop + 8;
    let left = rect.left - editorRect.left + (rect.width / 2) - 130; // Center the 260px wide control

    // If too close to the bottom of the editor viewport, render above the image
    if (rect.bottom - editorRect.top > editorRect.height - 120) {
      top = rect.top - editorRect.top + editorRef.current.scrollTop - 95;
    }

    // Keep popover bounded horizontally
    if (left < 10) left = 10;
    if (left > editorRect.width - 270) left = editorRect.width - 270;

    setImageControlPosition({ top, left });
  };

  // Editor Interaction Listeners
  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      // Clear previous outline if any
      if (selectedImage && selectedImage !== e.target) {
        selectedImage.style.outline = 'none';
        selectedImage.style.outlineOffset = '0';
        selectedImage.style.cursor = 'default';
      }
      
      setSelectedImage(e.target);
      e.target.style.outline = '3px solid #3b82f6'; // High-yield blue highlight
      e.target.style.outlineOffset = '2px';
      e.target.style.cursor = 'pointer';
      updateControlPosition(e.target);
    } else {
      if (selectedImage) {
        selectedImage.style.outline = 'none';
        selectedImage.style.outlineOffset = '0';
        selectedImage.style.cursor = 'default';
      }
      setSelectedImage(null);
      handleInput(); // Propagate clean state
    }
    updateActiveFormat();
  };

  const handleEditorKeyDown = (e) => {
    if (selectedImage) {
      selectedImage.style.outline = 'none';
      selectedImage.style.outlineOffset = '0';
      selectedImage.style.cursor = 'default';
      setSelectedImage(null);
      handleInput(); // Propagate clean state
    }
    // Wait for text cursor position to update before verifying format
    setTimeout(updateActiveFormat, 10);
  };

  const handleEditorScroll = () => {
    if (selectedImage) {
      updateControlPosition(selectedImage);
    }
  };

  // Image Settings Handlers
  const resizeImage = (width) => {
    if (selectedImage) {
      selectedImage.style.width = width;
      selectedImage.style.height = 'auto'; // Preserves aspect ratio
      handleInput();
      // Recalculate coordinates on next tick
      setTimeout(() => updateControlPosition(selectedImage), 10);
    }
  };

  const alignImage = (alignment) => {
    if (selectedImage) {
      if (alignment === 'left') {
        selectedImage.style.display = 'block';
        selectedImage.style.marginRight = 'auto';
        selectedImage.style.marginLeft = '0';
      } else if (alignment === 'center') {
        selectedImage.style.display = 'block';
        selectedImage.style.marginRight = 'auto';
        selectedImage.style.marginLeft = 'auto';
      } else if (alignment === 'right') {
        selectedImage.style.display = 'block';
        selectedImage.style.marginRight = '0';
        selectedImage.style.marginLeft = 'auto';
      } else {
        selectedImage.style.display = 'inline';
        selectedImage.style.margin = '0';
      }
      handleInput();
      setTimeout(() => updateControlPosition(selectedImage), 10);
    }
  };

  const deleteImage = () => {
    if (selectedImage) {
      selectedImage.remove();
      setSelectedImage(null);
      handleInput();
    }
  };

  // Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setIsUploading(true);
    
    // Save selection range to restore cursor position post-upload
    const selection = window.getSelection();
    let range;
    if (selection && selection.rangeCount > 0) {
       range = selection.getRangeAt(0);
    }

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/blogs/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (data.success && data.url) {
         // Restore cursor
         if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
         }
         if (editorRef.current) {
           editorRef.current.focus();
         }
         // Insert image element
         document.execCommand('insertImage', false, data.url);
         
         // Select the new image dynamically to trigger settings popover
         setTimeout(() => {
           if (editorRef.current) {
             const imgs = editorRef.current.getElementsByTagName('IMG');
             const lastImg = imgs[imgs.length - 1];
             if (lastImg) {
               lastImg.click(); // Trigger click event to open floating settings
             }
           }
         }, 100);

         handleInput();
      } else {
         toast.error(data.error || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-all shadow-sm">
        
        {/* Floating Image settings control */}
        {selectedImage && (
          <div 
            style={{ 
              top: `${imageControlPosition.top}px`, 
              left: `${imageControlPosition.left}px` 
            }}
            className="absolute bg-gray-900 dark:bg-gray-950 text-white p-2.5 rounded-xl flex items-center gap-3.5 shadow-xl z-[40] border border-gray-800 dark:border-gray-800 select-none animate-fade-in text-xs"
          >
            {/* Range Resize */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Size:</span>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={selectedImage.style.width ? parseInt(selectedImage.style.width) : 100} 
                  onChange={(e) => resizeImage(`${e.target.value}%`)}
                  className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] font-black text-blue-400 min-w-[28px] text-right">
                  {selectedImage.style.width ? selectedImage.style.width : '100%'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider mr-1">Quick:</span>
                {['25%', '50%', '75%', '100%'].map((sz) => (
                  <button 
                    key={sz} 
                    type="button" 
                    onClick={() => resizeImage(sz)} 
                    className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-[9px] font-bold border border-gray-700/50 hover:border-gray-600 transition-colors"
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-px h-8 bg-gray-800" />
            
            {/* Alignment buttons */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Align:</span>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => alignImage('left')} className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white" title="Align Left"><FiAlignLeft size={13} /></button>
                <button type="button" onClick={() => alignImage('center')} className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white" title="Align Center"><FiAlignCenter size={13} /></button>
                <button type="button" onClick={() => alignImage('right')} className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white" title="Align Right"><FiAlignRight size={13} /></button>
                <button 
                  type="button" 
                  onClick={() => alignImage('inline')} 
                  className="px-1.5 py-0.5 hover:bg-gray-800 rounded text-[9px] font-bold text-gray-400 hover:text-white transition-colors" 
                  title="Inline"
                >
                  Wrap
                </button>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-800" />

            {/* Trash button */}
            <button 
              type="button" 
              onClick={deleteImage} 
              className="p-1.5 bg-red-950/80 hover:bg-red-900/90 text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center justify-center border border-red-900/30"
              title="Delete Image"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-xl overflow-x-auto select-none">
          
          {/* Format Block Select (Heading support) */}
          <select 
            value={currentBlockFormat}
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors font-bold shadow-xs mr-1"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="blockquote">Quote Block</option>
          </select>

          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-0.5" />

          {/* Text decoration buttons */}
          <ToolbarButton onClick={() => execCommand('bold')} icon={<FiBold size={14} />} title="Bold" />
          <ToolbarButton onClick={() => execCommand('italic')} icon={<FiItalic size={14} />} title="Italic" />
          <ToolbarButton onClick={() => execCommand('underline')} icon={<FiUnderline size={14} />} title="Underline" />
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-0.5" />
          
          {/* Text Alignment buttons */}
          <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={<FiAlignLeft size={14} />} title="Align Left" />
          <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={<FiAlignCenter size={14} />} title="Align Center" />
          <ToolbarButton onClick={() => execCommand('justifyRight')} icon={<FiAlignRight size={14} />} title="Align Right" />
          <ToolbarButton onClick={() => execCommand('justifyFull')} icon={<FiAlignJustify size={14} />} title="Justify Text" />
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-0.5" />
          
          {/* List buttons */}
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={<FiList size={14} />} title="Bullet List" />
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={<OrderedListIcon />} title="Numbered List" />
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-0.5" />
          
          {/* Clear Format */}
          <ToolbarButton onClick={() => execCommand('removeFormat')} icon={<FiRotateCcw size={14} />} title="Clear Format" />
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-0.5" />
          
          {/* Image button */}
          <ToolbarButton 
             onClick={() => fileInputRef.current?.click()} 
             icon={isUploading ? <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-blue-500 border-gray-300"></span> : <FiImage size={14} />} 
             title="Insert Image" 
             disabled={isUploading}
          />
          <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleImageUpload} 
             accept="image/jpeg,image/png,image/webp,image/gif" 
             className="hidden" 
          />
        </div>

        {/* Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={handleEditorClick}
          onKeyDown={handleEditorKeyDown}
          onScroll={handleEditorScroll}
          className="p-4 min-h-[350px] max-h-[600px] overflow-y-auto outline-none text-gray-700 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none focus:ring-0"
          placeholder="Start writing your article body here..."
        />
      </div>
      <style>{`
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #9ca3af;
          cursor: text;
        }
      `}</style>
    </div>
  );
};

const ToolbarButton = ({ onClick, icon, title, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xs'}`}
  >
    {icon}
  </button>
);

export default RichTextEditor;
