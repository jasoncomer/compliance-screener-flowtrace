import { Response } from 'express';
import PdfPrinter from 'pdfmake';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import path from 'path';
import fs from 'fs';
import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { IReport, Tx } from '../typings/typings';
import { satsToBTC, truncateAddress } from './crypto';
import { formatDate } from './date';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

// Function to create pie chart image using chartjs-node-canvas and save it to a temporary file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createPieChartImage = async (received: number, sent: number): Promise<string | null> => {
  const width = 300; // width of the chart
  const height = 200; // height of the chart
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const configuration: ChartConfiguration = {
    type: 'pie',
    data: {
      labels: ['Received', 'Sent'],
      datasets: [
        {
          data: [received, sent],
          backgroundColor: ['#32CD32', '#FF6347'],
        },
      ],
    },
    options: {
      responsive: true,
    },
  };

  try {
    // Render the chart to a buffer
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

    // Save the image to a temporary file
    const tempImagePath = path.join(__dirname, '..', 'assets', 'temp', `chart-${Date.now()}.png`);
    fs.writeFileSync(tempImagePath, new Uint8Array(imageBuffer));

    return tempImagePath;
  } catch (error) {
    console.error('Error creating chart image:', error);
    return null;
  }
};

const formatTransactions = (transactions: Tx[]) => {
  return transactions.map((tx) => [
    formatDate(tx.received),
    satsToBTC(tx.total),
    tx.total > 0 ? 'Received' : 'Sent',
    satsToBTC(tx.fees),
    truncateAddress(tx.addresses[0]),
  ]);
};

export const createPDFReport = async (report: IReport, res: Response) => {
  try {
    const imgPath = path.join(__dirname, '..', 'assets', 'img');
    const fontPath = path.join(__dirname, '..', 'assets', 'fonts');
    const fonts = {
      Roboto: {
        normal: path.join(fontPath, 'Roboto-Regular.ttf'),
        bold: path.join(fontPath, 'Roboto-Medium.ttf'),
        italics: path.join(fontPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontPath, 'Roboto-MediumItalic.ttf'),
      },
    };

    const printer = new PdfPrinter(fonts);

    // Create the pie chart image and get the file path
    // const pieChartImagePath = await createPieChartImage(report.totalReceived, report.totalSent);

    const docDefinition = {
      content: [
        {
          image: `${imgPath}/logo.jpeg`,
          width: 150,
          alignment: 'center',
        },
        { text: '\n' },
        { text: 'Bitcoin Wallet Report', style: 'header' },
        { text: `Generated on: ${formatDate(new Date().toISOString())}`, style: 'subheader' },
        { text: '\n' },

        // Wallet Overview Section
        { text: 'Wallet Overview', style: 'sectionHeader' },
        {
          columns: [
            [
              { text: `Address: ${report.address}`, style: 'item' },
              { text: `Current Balance: ${satsToBTC(report.currentBalance ?? 0)} BTC`, style: 'item' },
              { text: `Total Received: ${satsToBTC(report.totalReceived)} BTC`, style: 'item' },
              { text: `Total Sent: ${satsToBTC(report.totalSent)} BTC`, style: 'item' },
              { text: `Transaction Count: ${report.transactionCount}`, style: 'item' },
            ],
            // {
            //   image: pieChartImagePath,
            //   width: 300,
            //   alignment: 'center',
            //   margin: [0, 0, 0, 0],
            // },
          ],
        },
        { text: '\n' },

        // Analysis Summary
        { text: 'Analysis Summary', style: 'sectionHeader' },
        {
          text: `Upon algorithmic analysis of your address ${report.address}, we have determined the current distribution of funds. This report provides a comprehensive overview of your Bitcoin wallet activity, including detailed transaction history and balance information.`,
          style: 'paragraph',
        },
        { text: '\n' },

        // Transaction History
        { text: 'Transaction History', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', '*'],
            body: [
              [
                { text: 'Date', style: 'tableHeader' },
                { text: 'Amount (BTC)', style: 'tableHeader' },
                { text: 'Type', style: 'tableHeader' },
                { text: 'Fee (BTC)', style: 'tableHeader' },
                { text: 'Address', style: 'tableHeader' },
              ],
              ...formatTransactions(report.txs),
            ],
          },
        },
        { text: '\n' },

        // Conclusion
        { text: 'Conclusion', style: 'sectionHeader' },
        {
          text: 'This report provides a snapshot of your Bitcoin wallet activity. For a more detailed analysis or if you require additional support, please contact our support team or visit our website.',
          style: 'paragraph',
        },
        { text: '\n' },

        // Disclaimer
        { text: 'Disclaimer', style: 'sectionHeader' },
        {
          text: 'This report is generated based on publicly available blockchain data and is provided for informational purposes only. It should not be considered as financial or investment advice. Always consult with a qualified professional before making any financial decisions.',
          style: 'paragraph',
        },
      ],
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          alignment: 'center',
          color: '#1a5f7a',
        },
        subheader: {
          fontSize: 14,
          alignment: 'center',
          color: '#666666',
        },
        sectionHeader: {
          fontSize: 18,
          bold: true,
          margin: [0, 10, 0, 5],
          color: '#1a5f7a',
        },
        item: {
          fontSize: 12,
          margin: [0, 0, 0, 5],
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          color: '#1a5f7a',
        },
        paragraph: {
          fontSize: 12,
          margin: [0, 5, 0, 5],
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },

      footer(currentPage: number, pageCount: number) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 10,
          color: '#666666',
        };
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(res);
    pdfDoc.end();

    // Clean up the temporary image file after the PDF is generated
    // if (pieChartImagePath) {
    //   fs.unlinkSync(pieChartImagePath);
    // }
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'An error occurred while generating the PDF report' });
  }
};
