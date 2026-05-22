import { Item } from "@/app/hooks/useItems";
import { Category } from "@/app/hooks/useCategories";

// Convert items to CSV format
export function itemsToCSV(items: Item[], categoryName: string): string {
    const headers = ["ID", "Başlık", "Açıklama", "Kategori", "Durum", "Sahip", "Tarih", "Fotoğraflar"];

    const rows = items.map(item => [
        item.id,
        escapeCsvField(item.title),
        escapeCsvField(item.description || ""),
        categoryName,
        item.status ? "Tamamlandı" : "Bekliyor",
        item.owner || "",
        item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
        item.image_urls ? item.image_urls.join("; ") : ""
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    return csvContent;
}

// Escape CSV field to handle commas and quotes
function escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

// Escape HTML characters for Word export
function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

// Convert items to DOC (HTML format readable by Word)
export function itemsToWord(items: Item[], categoryName: string): string {
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${categoryName} Export</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; font-size: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 30px; }
            .item { margin-bottom: 40px; page-break-inside: avoid; }
            .item-title { font-size: 24px; font-weight: bold; color: #1a202c; margin-bottom: 8px; }
            .meta-info { font-size: 12px; color: #718096; margin-bottom: 16px; font-style: italic; }
            .status-badge { display: inline-block; padding: 4px 8px; background-color: #fef3c7; color: #d97706; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
            .status-badge.completed { background-color: #d1fae5; color: #059669; }
            .content { line-height: 1.6; color: #2d3748; margin-top: 15px; white-space: pre-wrap; tab-size: 4; }
            .content p { margin-bottom: 1em; }
            hr.divider { border: 0; border-top: 1px dashed #cbd5e0; margin: 30px 0; }
        </style>
        </head>
        <body>
            <h1>${categoryName}</h1>
            ${items.map(item => {
                const statusStr = item.status ? "TAMAMLANDI" : "BEKLİYOR";
                const statusClass = item.status ? "completed" : "";
                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
                
                return `
                    <div class="item">
                        <span class="status-badge ${statusClass}">${statusStr}</span>
                        <div class="item-title">${escapeHtml(item.title)}</div>
                        <div class="meta-info">
                            Tarih: ${dateStr} | Kategori: ${escapeHtml(categoryName)} | Sahip: ${escapeHtml(item.owner || "")}
                        </div>
                        <div class="content">
                            ${(item.description || "").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")}
                        </div>
                        <hr class="divider" />
                    </div>
                `;
            }).join("")}
        </body>
        </html>
    `;
    return htmlContent;
}


// Convert items to JSON format
export function itemsToJSON(items: Item[], categoryName: string): string {
    const exportData = {
        exportDate: new Date().toISOString(),
        category: categoryName,
        itemCount: items.length,
        items: items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            owner: item.owner,
            created_at: item.created_at,
            image_urls: item.image_urls
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

// Export all data (categories + items)
export function allDataToCSV(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const headers = ["ID", "Başlık", "Açıklama", "Kategori", "Durum", "Sahip", "Tarih", "Fotoğraflar"];

    const allRows: string[][] = [];

    categories.forEach(category => {
        const categoryItems = itemsByCategory[category.key] || [];
        categoryItems.forEach(item => {
            allRows.push([
                String(item.id),
                escapeCsvField(item.title),
                escapeCsvField(item.description || ""),
                category.name,
                item.status ? "Tamamlandı" : "Bekliyor",
                item.owner || "",
                item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
                item.image_urls ? item.image_urls.join("; ") : ""
            ]);
        });
    });

    const csvContent = [
        headers.join(","),
        ...allRows.map(row => row.join(","))
    ].join("\n");

    return csvContent;
}

// Export all data to JSON
export function allDataToJSON(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const exportData = {
        exportDate: new Date().toISOString(),
        totalCategories: categories.length,
        totalItems: Object.values(itemsByCategory).reduce((sum, items) => sum + items.length, 0),
        categories: categories.map(category => ({
            id: category.id,
            name: category.name,
            key: category.key,
            icon: category.icon_name,
            is_private: category.is_private,
            itemCount: (itemsByCategory[category.key] || []).length,
            items: itemsByCategory[category.key] || []
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

// Export all data to Word (HTML format readable by Word)
export function allDataToWord(categories: Category[], itemsByCategory: Record<string, Item[]>): string {
    const allRows: string[] = [];

    categories.forEach(category => {
        const categoryItems = itemsByCategory[category.key] || [];
        if (categoryItems.length > 0) {
            allRows.push(`<h2>${escapeHtml(category.name)}</h2>`);
            categoryItems.forEach(item => {
                const statusStr = item.status ? "TAMAMLANDI" : "BEKLİYOR";
                const statusClass = item.status ? "completed" : "";
                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
                
                allRows.push(`
                    <div class="item">
                        <span class="status-badge ${statusClass}">${statusStr}</span>
                        <div class="item-title">${escapeHtml(item.title)}</div>
                        <div class="meta-info">
                            Tarih: ${dateStr} | Sahip: ${escapeHtml(item.owner || "")}
                        </div>
                        <div class="content">
                            ${(item.description || "").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")}
                        </div>
                        <hr class="divider" />
                    </div>
                `);
            });
        }
    });

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Tüm Veriler Export</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; font-size: 32px; text-align: center; margin-bottom: 40px; }
            h2 { color: #34495e; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px; }
            .item { margin-bottom: 40px; page-break-inside: avoid; }
            .item-title { font-size: 24px; font-weight: bold; color: #1a202c; margin-bottom: 8px; }
            .meta-info { font-size: 12px; color: #718096; margin-bottom: 16px; font-style: italic; }
            .status-badge { display: inline-block; padding: 4px 8px; background-color: #fef3c7; color: #d97706; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
            .status-badge.completed { background-color: #d1fae5; color: #059669; }
            .content { line-height: 1.6; color: #2d3748; margin-top: 15px; white-space: pre-wrap; tab-size: 4; }
            .content p { margin-bottom: 1em; }
            hr.divider { border: 0; border-top: 1px dashed #cbd5e0; margin: 30px 0; }
        </style>
        </head>
        <body>
            <h1>Tüm Veriler</h1>
            ${allRows.join("")}
        </body>
        </html>
    `;
    return htmlContent;
}

// Trigger file download in browser
export function downloadFile(content: string, filename: string, type: "csv" | "json" | "doc"): void {
    const mimeTypes = {
        csv: "text/csv;charset=utf-8;",
        json: "application/json;charset=utf-8;",
        doc: "application/msword;charset=utf-8;"
    };

    const blob = new Blob([content], { type: mimeTypes[type] });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// Generate filename with date
export function getExportFilename(baseName: string, type: "csv" | "json" | "doc"): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `heartsync_${baseName}_${date}.${type}`;
}
