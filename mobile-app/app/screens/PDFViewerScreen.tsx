import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { pdfService, type PdfFetchedFile } from '../services/pdf.service';
import { COLORS } from '../utils/constants';

/**
 * Params que recibe la pantalla por navigation.navigate('PDFViewer', {...}).
 */
export interface PDFViewerParams {
  /** URL completa al endpoint que devuelve `application/pdf`. */
  url: string;
  /** Nombre base sugerido para el archivo descargado (sin extension). */
  baseFilename: string;
  /** Titulo a mostrar en el header. */
  title: string;
}

type ViewerRoute = RouteProp<{ PDFViewer: PDFViewerParams }, 'PDFViewer'>;
type ViewerNav = StackNavigationProp<{ PDFViewer: PDFViewerParams }>;

type Estado =
  | { kind: 'cargando' }
  | { kind: 'listo'; file: PdfFetchedFile }
  | { kind: 'error'; mensaje: string };

/**
 * Visor in-app de PDFs.
 *
 * - Al montar, descarga el PDF al cache de la app con el JWT del usuario.
 * - Mientras descarga muestra un spinner.
 * - Cuando termina, renderiza el PDF con `react-native-pdf` (zoom, scroll
 *   y paginas embebidos).
 * - Header derecho con 2 botones rapidos: Guardar (manda a Descargas) y
 *   Compartir (abre el chooser nativo de Android: WhatsApp, Drive, Gmail,
 *   etc.). El usuario nunca sale de la app para ver el PDF.
 */
export default function PDFViewerScreen() {
  const route = useRoute<ViewerRoute>();
  const navigation = useNavigation<ViewerNav>();
  const { url, baseFilename, title } = route.params;

  const [estado, setEstado] = useState<Estado>({ kind: 'cargando' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [accionEnCurso, setAccionEnCurso] = useState(false);

  // Descarga al cache cuando se monta.
  useEffect(() => {
    let activo = true;
    pdfService
      .fetchToCache({ url, baseFilename, title })
      .then((file) => {
        if (activo) setEstado({ kind: 'listo', file });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ kind: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, [url, baseFilename, title]);

  const guardar = useCallback(async () => {
    if (estado.kind !== 'listo') return;
    setAccionEnCurso(true);
    try {
      const destino = await pdfService.saveToDownloads(estado.file);
      Alert.alert(
        'PDF guardado',
        `Disponible en Descargas:\n${destino.split('/').pop()}`,
      );
    } catch (err) {
      Alert.alert(
        'No se pudo guardar',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setAccionEnCurso(false);
    }
  }, [estado]);

  const compartir = useCallback(async () => {
    if (estado.kind !== 'listo') return;
    setAccionEnCurso(true);
    try {
      await pdfService.share(estado.file);
    } catch (err) {
      Alert.alert(
        'No se pudo abrir el menu de compartir',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setAccionEnCurso(false);
    }
  }, [estado]);

  // Mete los botones Guardar y Compartir en el header de la pantalla.
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            disabled={estado.kind !== 'listo' || accionEnCurso}
            onPress={guardar}
            style={[
              styles.headerBtn,
              (estado.kind !== 'listo' || accionEnCurso) && styles.headerBtnOff,
            ]}>
            <Text style={styles.headerBtnTxt}>💾</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={estado.kind !== 'listo' || accionEnCurso}
            onPress={compartir}
            style={[
              styles.headerBtn,
              (estado.kind !== 'listo' || accionEnCurso) && styles.headerBtnOff,
            ]}>
            <Text style={styles.headerBtnTxt}>📤</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, title, estado, accionEnCurso, guardar, compartir]);

  if (estado.kind === 'cargando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.cargandoTxt}>Generando PDF…</Text>
      </View>
    );
  }

  if (estado.kind === 'error') {
    return (
      <View style={styles.centro}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitulo}>No se pudo generar el PDF</Text>
        <Text style={styles.errorDetalle}>{estado.mensaje}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.btnVolver}>
          <Text style={styles.btnVolverTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri: `file://${estado.file.localPath}`, cache: false }}
        style={styles.pdf}
        trustAllCerts={false}
        onLoadComplete={(numberOfPages) => setTotalPaginas(numberOfPages)}
        onPageChanged={(page) => setPaginaActual(page)}
        onError={(err) =>
          setEstado({
            kind: 'error',
            mensaje:
              err instanceof Error ? err.message : 'Error renderizando PDF',
          })
        }
      />
      {totalPaginas > 0 && (
        <View style={styles.pieDePagina}>
          <Text style={styles.pieTxt}>
            Página {paginaActual} de {totalPaginas}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  pdf: { flex: 1, width: '100%', backgroundColor: '#1F2937' },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  cargandoTxt: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  errorIcon: { fontSize: 42, marginBottom: 12 },
  errorTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorDetalle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  btnVolver: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnVolverTxt: { color: '#fff', fontWeight: '700' },
  pieDePagina: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pieTxt: { color: '#F9FAFB', fontSize: 12, fontWeight: '600' },
  headerRight: { flexDirection: 'row', marginRight: 8 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerBtnOff: { opacity: 0.35 },
  headerBtnTxt: { fontSize: 18 },
});
