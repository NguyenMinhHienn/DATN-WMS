export function numberToWords(number: number): string {
    if (number === 0) return 'Không đồng';
    if (isNaN(number) || number < 0) return '';
    
    const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
    const units = ('1 một' + defaultNumbers).split(' ');
    const ch = 'lẻ mười' + defaultNumbers;
    const tr = 'không một' + defaultNumbers;
    const tram = tr.split(' ');
    const u = '2 nghìn triệu tỉ'.split(' ');
    const chuc = ch.split(' ');

    const readBlock = (n: string, full: boolean) => {
        let res = '';
        const a = parseInt(n.charAt(0));
        const b = parseInt(n.charAt(1));
        const c = parseInt(n.charAt(2));

        if (full || a !== 0) res += tram[a] + ' trăm ';

        if (b === 0 && c === 0) return res;
        
        if (b === 0) {
            res += 'lẻ ' + units[c];
            return res;
        }

        if (b === 1) res += 'mười ';
        else res += chuc[b] + ' mươi ';

        if (c === 1 && b !== 1) res += 'mốt';
        else if (c === 5) res += 'lăm';
        else if (c !== 0) res += units[c];

        return res;
    };

    let str = Math.round(number).toString();
    while (str.length % 3 !== 0) str = '0' + str;

    const blocks = [];
    for (let i = 0; i < str.length; i += 3) {
        blocks.push(str.substring(i, i + 3));
    }

    let result = '';
    const length = blocks.length;

    for (let i = 0; i < length; i++) {
        const full = (i > 0 && typeof result === 'string' && result.length > 0);
        if (blocks[i] !== '000') {
            const index = length - i - 1;
            let unitStr = index > 0 ? (' ' + u[index % 3 || 3] + ' ') : '';
            if (index > 3) unitStr = ' tỷ '; // Handle > 999 tỷ if needed
            result += readBlock(blocks[i], full) + unitStr;
        }
    }

    result = result.replace(/lẻ không/g, '').replace(/mươi không/g, 'mươi').trim();
    if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    return result + ' đồng';
}
