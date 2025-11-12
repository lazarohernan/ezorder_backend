import jsPDF from 'jspdf';
import type { Pedido } from '@/interfaces/Pedido';
import type { PedidoItem } from '@/interfaces/PedidoItem';
import type { Restaurante } from '@/interfaces/Restaurante';
import type { MetodoPago } from '@/interfaces/MetodoPago';

export interface InvoiceData {
  pedido: Pedido;
  items: PedidoItem[];
  restaurante: Restaurante;
  metodoPago?: MetodoPago;
}

class PDFService {
  private currencyFormatter: Intl.NumberFormat = new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });

  private formatCurrency(value: number): string {
    const amount = value ?? 0;
    const sign = amount < 0 ? '-' : '';
    return `${sign}Lp. ${this.currencyFormatter.format(Math.abs(amount))}`;
  }

  /**
   * Generar PDF en tamaño carta (8.5" x 11")
   */
  generateNormalPDF(data: InvoiceData): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header del restaurante
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.restaurante.nombre_restaurante, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (data.restaurante.direccion_restaurante) {
      doc.text(data.restaurante.direccion_restaurante, pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 7;
    }

    // Información de contacto (placeholder - se puede agregar a la interfaz Restaurante después)
    doc.text('Tel: 504-0000-0000', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
    doc.text('RTN: 08011234567890', pageWidth / 2, yPosition, { align: 'center' });

    // Línea separadora
    yPosition += 15;
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Información del pedido
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Información en dos columnas
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;

    doc.text(`Ticket #: ${data.pedido.numero_ticket || data.pedido.id.substring(0, 8)}`, leftCol, yPosition);
    doc.text(
      `Fecha: ${new Date(data.pedido.created_at).toLocaleDateString()}`,
      rightCol,
      yPosition,
    );

    yPosition += 7;
    doc.text(`Tipo: ${this.formatTipoPedido(data.pedido.tipo_pedido)}`, leftCol, yPosition);
    doc.text(`Estado: ${this.formatEstadoPedido(data.pedido.estado_pedido)}`, rightCol, yPosition);

    if (data.pedido.mesa) {
      yPosition += 7;
      doc.text(`Mesa: ${data.pedido.mesa}`, leftCol, yPosition);
    }

    // Información del cliente (siempre mostrar)
    yPosition += 7;
    const clienteNombre = data.pedido.clientes?.nombre_cliente || 'Consumidor Final';
    doc.text(`Cliente: ${clienteNombre}`, leftCol, yPosition);

    // Información del método de pago
    if (data.metodoPago) {
      yPosition += 7;
      doc.text(`Método de pago: ${data.metodoPago.metodo}`, leftCol, yPosition);
    }

    // Items del pedido
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DEL PEDIDO', leftCol, yPosition);

    yPosition += 10;
    // Headers de la tabla
    doc.text('Cant.', leftCol, yPosition);
    doc.text('Descripción', leftCol + 20, yPosition);
    doc.text('Precio Unit.', leftCol + 100, yPosition);
    doc.text('Total', leftCol + 140, yPosition);

    yPosition += 5;
    doc.line(leftCol, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Items
    doc.setFont('helvetica', 'normal');
    data.items.forEach((item) => {
      doc.text(item.cantidad.toString(), leftCol, yPosition);
      doc.text(item.nombre_menu, leftCol + 20, yPosition);
      doc.text(this.formatCurrency(item.precio_unitario || 0), leftCol + 100, yPosition);
      doc.text(this.formatCurrency(item.total_item || 0), leftCol + 140, yPosition);
      yPosition += 7;
    });

    // Totales
    yPosition += 10;
    doc.line(leftCol + 100, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    const totalsX = leftCol + 100;
    doc.text(`Subtotal:`, totalsX, yPosition);
    doc.text(this.formatCurrency(data.pedido.subtotal || 0), leftCol + 140, yPosition);

    yPosition += 7;
    if (data.pedido.importe_exonerado && data.pedido.importe_exonerado > 0) {
      doc.text(`Importe Exonerado:`, totalsX, yPosition);
      doc.text(this.formatCurrency(data.pedido.importe_exonerado || 0), leftCol + 140, yPosition);
      yPosition += 7;
    }

    if (data.pedido.importe_exento && data.pedido.importe_exento > 0) {
      doc.text(`Importe Exento:`, totalsX, yPosition);
      doc.text(this.formatCurrency(data.pedido.importe_exento || 0), leftCol + 140, yPosition);
      yPosition += 7;
    }

    if (data.pedido.importe_gravado && data.pedido.importe_gravado > 0) {
      doc.text(`Importe Gravado:`, totalsX, yPosition);
      doc.text(this.formatCurrency(data.pedido.importe_gravado || 0), leftCol + 140, yPosition);
      yPosition += 7;
    }

    // Siempre mostrar descuento
    doc.text(`Descuento:`, totalsX, yPosition);
    doc.text(this.formatCurrency(-(data.pedido.descuento || 0)), leftCol + 140, yPosition);
    yPosition += 7;

    doc.text(`ISV (15%):`, totalsX, yPosition);
    doc.text(this.formatCurrency(data.pedido.impuesto || 0), leftCol + 140, yPosition);

    yPosition += 10;
    doc.line(leftCol + 100, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL`, totalsX, yPosition);
    doc.text(this.formatCurrency(data.pedido.total || 0), leftCol + 140, yPosition);

    // Footer
    yPosition += 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su preferencia!', pageWidth / 2, yPosition, { align: 'center' });

    return doc;
  }

  /**
   * Generar PDF para impresora térmica de 80mm
   */
  generate80mmPDF(data: InvoiceData): jsPDF {
    // 80mm = 3.15 inches, usando 72 DPI = 226.77 points
    const doc = new jsPDF({
      unit: 'pt',
      format: [226.77, 841.89], // Ancho fijo, alto variable
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Header del restaurante
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const restauranteName = this.wrapText(doc, data.restaurante.nombre_restaurante, contentWidth);
    restauranteName.forEach((line) => {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 14;
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (data.restaurante.direccion_restaurante) {
      const address = this.wrapText(doc, data.restaurante.direccion_restaurante, contentWidth);
      address.forEach((line) => {
        doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
      });
    }

    // Información de contacto (placeholder - se puede agregar a la interfaz Restaurante después)
    doc.text('Tel: 504-0000-0000', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('RTN: 08011234567890', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Línea separadora
    yPosition += 10;
    doc.text('================================', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Información del pedido - FACTURA destacada
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Número de pedido destacado
    doc.setFontSize(10);
    doc.text(`TICKET #${(data.pedido.numero_ticket || data.pedido.id.substring(0, 8))}`, pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 15;

    // Información básica del pedido
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Fecha y hora completa
    const fechaCompleta = new Date(data.pedido.created_at);
    doc.text(`Fecha: ${fechaCompleta.toLocaleDateString('es-HN')}`, margin, yPosition);
    yPosition += 10;
    doc.text(`Hora: ${fechaCompleta.toLocaleTimeString('es-HN')}`, margin, yPosition);
    yPosition += 10;

    // Estado del pedido
    doc.text(`Estado: ${this.formatEstadoPedido(data.pedido.estado_pedido)}`, margin, yPosition);
    yPosition += 10;

    // Tipo de pedido
    doc.text(`Tipo: ${this.formatTipoPedido(data.pedido.tipo_pedido)}`, margin, yPosition);
    yPosition += 10;

    // Mesa (si aplica)
    if (data.pedido.mesa) {
      doc.text(`Mesa: ${data.pedido.mesa}`, margin, yPosition);
      yPosition += 10;
    }

    // Información del método de pago
    if (data.metodoPago) {
      doc.text(`Método de pago: ${data.metodoPago.metodo}`, margin, yPosition);
      yPosition += 10;
    }

    // Estado de pago (si es confirmado, siempre es pagado)
    const estadoPagado =
      data.pedido.estado_pedido === 'confirmado' ? 'SÍ' : data.pedido.pagado ? 'SÍ' : 'NO';
    doc.text(`Pagado: ${estadoPagado}`, margin, yPosition);
    yPosition += 10;

    // Información del cliente (siempre mostrar)
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE:', margin, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'normal');

    const clienteNombre = data.pedido.clientes?.nombre_cliente || 'Consumidor Final';
    const clientName = this.wrapText(doc, `Nombre: ${clienteNombre}`, contentWidth);
    clientName.forEach((line) => {
      doc.text(line, margin, yPosition);
      yPosition += 10;
    });

    // Solo mostrar información adicional si hay cliente seleccionado
    if (data.pedido.clientes?.nombre_cliente) {
      if (data.pedido.clientes.tel_cliente) {
        doc.text(`Teléfono: ${data.pedido.clientes.tel_cliente}`, margin, yPosition);
        yPosition += 10;
      }

      if (data.pedido.clientes.correo_cliente) {
        const emailLines = this.wrapText(
          doc,
          `Email: ${data.pedido.clientes.correo_cliente}`,
          contentWidth,
        );
        emailLines.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 10;
        });
      }

      if (data.pedido.clientes.direccion_cliente) {
        const direccionLines = this.wrapText(
          doc,
          `Dirección: ${data.pedido.clientes.direccion_cliente}`,
          contentWidth,
        );
        direccionLines.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 10;
        });
      }
    }

    // Dirección de entrega (si es diferente o es domicilio)
    if (data.pedido.direccion_entrega && data.pedido.tipo_pedido === 'domicilio') {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('DIRECCIÓN DE ENTREGA:', margin, yPosition);
      yPosition += 10;
      doc.setFont('helvetica', 'normal');

      const entregaLines = this.wrapText(doc, data.pedido.direccion_entrega, contentWidth);
      entregaLines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 10;
      });
    }

    // Fecha de entrega programada
    if (data.pedido.fecha_entrega) {
      const fechaEntrega = new Date(data.pedido.fecha_entrega);
      doc.text(`Fecha entrega: ${fechaEntrega.toLocaleDateString('es-HN')}`, margin, yPosition);
      yPosition += 10;
      doc.text(`Hora entrega: ${fechaEntrega.toLocaleTimeString('es-HN')}`, margin, yPosition);
      yPosition += 10;
    }

    // Usuario que tomó el pedido
    if (data.pedido.usuarios_info?.nombre_usuario) {
      doc.text(`Atendido por: ${data.pedido.usuarios_info.nombre_usuario}`, margin, yPosition);
      yPosition += 10;
    }

    // Notas del pedido
    if (data.pedido.notas) {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS DEL PEDIDO:', margin, yPosition);
      yPosition += 10;
      doc.setFont('helvetica', 'normal');

      const notasLines = this.wrapText(doc, data.pedido.notas, contentWidth);
      notasLines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 10;
      });
    }

    // Items del pedido
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DEL PEDIDO:', margin, yPosition);
    yPosition += 10;
    doc.text('================================', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    data.items.forEach((item) => {
      // Nombre del item
      const itemName = this.wrapText(doc, item.nombre_menu, contentWidth);
      itemName.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 10;
      });

      // Precio y cantidad
      doc.text(
        `${item.cantidad} x L${(item.precio_unitario || 0).toFixed(2)}`,
        margin + 10,
        yPosition,
      );
      doc.text(`L${item.total_item.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // ISV por item si existe
      if (item.impuesto_unitario && item.impuesto_unitario > 0) {
        doc.text(
          `ISV: ${item.cantidad} x L${item.impuesto_unitario.toFixed(2)}`,
          margin + 10,
          yPosition,
        );
        doc.text(
          `L${(item.impuesto_unitario * item.cantidad).toFixed(2)}`,
          pageWidth - margin,
          yPosition,
          { align: 'right' },
        );
        yPosition += 8;
      }

      // Notas del item si existen
      if (item.notas) {
        doc.setFontSize(7);
        const itemNotasLines = this.wrapText(doc, `Nota: ${item.notas}`, contentWidth - 20);
        itemNotasLines.forEach((line) => {
          doc.text(line, margin + 10, yPosition);
          yPosition += 8;
        });
        doc.setFontSize(8);
      }

      // Estado de envío a cocina
      if (item.enviado_a_cocina) {
        doc.setFontSize(7);
        doc.text('✓ Enviado a cocina', margin + 10, yPosition);
        yPosition += 8;
        doc.setFontSize(8);
      }

      yPosition += 5; // Espacio entre items
    });

    // Información fiscal detallada
    yPosition += 5;
    doc.text('--------------------------------', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FISCAL:', margin, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'normal');

    // Importes fiscales
    if (data.pedido.importe_exento && data.pedido.importe_exento > 0) {
      doc.text('Importe Exento:', margin, yPosition);
      doc.text(`L${data.pedido.importe_exento.toFixed(2)}`, pageWidth - margin, yPosition, {
        align: 'right',
      });
      yPosition += 10;
    }

    if (data.pedido.importe_exonerado && data.pedido.importe_exonerado > 0) {
      doc.text('Importe Exonerado:', margin, yPosition);
      doc.text(`L${data.pedido.importe_exonerado.toFixed(2)}`, pageWidth - margin, yPosition, {
        align: 'right',
      });
      yPosition += 10;
    }

    if (data.pedido.importe_gravado && data.pedido.importe_gravado > 0) {
      doc.text('Importe Gravado:', margin, yPosition);
      doc.text(`L${data.pedido.importe_gravado.toFixed(2)}`, pageWidth - margin, yPosition, {
        align: 'right',
      });
      yPosition += 10;
    }

    // Totales
    yPosition += 5;
    doc.text('--------------------------------', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.text('Subtotal:', margin, yPosition);
    doc.text(`L${data.pedido.subtotal.toFixed(2)}`, pageWidth - margin, yPosition, {
      align: 'right',
    });
    yPosition += 10;

    // Siempre mostrar descuento
    doc.text('Descuento:', margin, yPosition);
    doc.text(`-L${(data.pedido.descuento || 0).toFixed(2)}`, pageWidth - margin, yPosition, {
      align: 'right',
    });
    yPosition += 10;

    doc.text('ISV (15%):', margin, yPosition);
    doc.text(`L${data.pedido.impuesto.toFixed(2)}`, pageWidth - margin, yPosition, {
      align: 'right',
    });
    yPosition += 10;

    doc.text('================================', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin, yPosition);
    doc.text(`L${data.pedido.total.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 20;

    // Información adicional
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // ID completo del pedido
    doc.text(`ID Pedido: ${data.pedido.id}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Fecha de impresión
    doc.text(`Impreso: ${new Date().toLocaleString('es-HN')}`, pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 15;

    // Footer
    doc.text('¡Gracias por su preferencia!', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('Que tenga un excelente día', pageWidth / 2, yPosition, { align: 'center' });

    return doc;
  }

  /**
   * Abrir WhatsApp con el PDF
   */
  async sendViaWhatsApp(pdf: jsPDF, phoneNumber: string, pedidoId: string): Promise<void> {
    try {
      // Convertir PDF a blob
      const pdfBlob = pdf.output('blob');

      // Crear URL del archivo
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Mensaje para WhatsApp
      const message = `Hola! Te envío la factura del pedido #${pedidoId.substring(0, 8)}. ¡Gracias por tu preferencia!`;

      // Limpiar número de teléfono (remover espacios y caracteres especiales)
      const cleanPhone = phoneNumber.replace(/\D/g, '');

      // URL de WhatsApp
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      // Descargar el PDF primero
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `factura_${pedidoId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Mostrar notificación de descarga
      this.showDownloadNotification(pedidoId);

      // Esperar un poco y abrir WhatsApp
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 1000);

      // Limpiar URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
    } catch (error) {
      console.error('Error al enviar por WhatsApp:', error);
      throw new Error('No se pudo enviar por WhatsApp');
    }
  }

  /**
   * Imprimir PDF
   */
  printPDF(pdf: jsPDF): void {
    try {
      // Método 1: Intentar abrir en nueva ventana para imprimir
      const pdfUrl = pdf.output('bloburl');
      const printWindow = window.open(pdfUrl, '_blank');

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Método 2: Si el popup blocker bloquea la ventana, descargar el PDF
        console.warn('Ventana bloqueada, descargando PDF...');
        pdf.save(`pedido-${Date.now()}.pdf`);
        
        // Mostrar mensaje al usuario
        alert('El PDF se ha descargado. Ábrelo e imprímelo manualmente.');
      }
    } catch (error) {
      console.error('Error al imprimir:', error);
      // Fallback: Descargar el PDF
      try {
        pdf.save(`pedido-${Date.now()}.pdf`);
        alert('El PDF se ha descargado. Ábrelo e imprímelo manualmente.');
      } catch (downloadError) {
        console.error('Error al descargar PDF:', downloadError);
        throw new Error('No se pudo imprimir ni descargar el documento');
      }
    }
  }

  // Métodos auxiliares
  private formatTipoPedido(tipo: string): string {
    const tipos: Record<string, string> = {
      local: 'Local',
      domicilio: 'Domicilio',
      recoger: 'Para llevar',
      mesa: 'Mesa',
    };
    return tipos[tipo] || tipo;
  }

  private formatEstadoPedido(estado: string): string {
    const estados: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      'en preparacion': 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };
    return estados[estado] || estado;
  }

  private wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = doc.getTextWidth(testLine);

      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private showDownloadNotification(pedidoId: string): void {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-width: 350px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <div style="font-size: 20px;">📄</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">
            Factura descargada exitosamente
          </div>
          <div style="opacity: 0.9; font-size: 12px; margin-bottom: 8px;">
            factura_${pedidoId.substring(0, 8)}.pdf
          </div>
          <div style="font-size: 12px; opacity: 0.8;">
            Se abrirá WhatsApp. Arrastra el archivo al chat para adjuntarlo.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Remover la notificación después de 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

export default new PDFService();
