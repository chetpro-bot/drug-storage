import kpicLiveDump from '../constants/kpicLiveDump.json';
import { normalizeCategory } from './categoryColors';

export interface KpicTreeIngredient {
  key: string;
  kpicCode: string;
  englishInn: string;
  koreanName: string;
  chemicalFormName?: string;
  functionalCategory: string;
  productNames: string[];
  productCount: number;
}

export interface KpicTreeNode {
  code: string;
  label: string;
  ename: string;
  level: number; // 1: 대분류, 2: 중분류, 3: 소분류, 4: 세분류
  children: KpicTreeNode[];
  ingredients: KpicTreeIngredient[];
  totalIngredientsCount: number;
  productIngredientsCount: number;
  productNames: string[];
}

export interface IngredientRowInput {
  key: string;
  englishInn: string;
  koreanName: string;
  functionalCategory: string;
  chemicalFormName?: string;
  productNames: string[];
  productCount: number;
}

const cleanToken = (str: string) => str.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

/**
 * 약학정보원(health.kr) 공식 계층 데이터로부터 대분류-중분류-소분류-성분 트리 구성
 */
export function buildKpicTree(userIngredients: IngredientRowInput[]): KpicTreeNode[] {
  // 1. 사용자 성분 매핑 인덱스 (정규화된 토큰 기반)
  const userMap = new Map<string, IngredientRowInput>();
  userIngredients.forEach((item) => {
    userMap.set(item.key.toLowerCase(), item);
    const cleanK = cleanToken(item.englishInn);
    if (cleanK) userMap.set(cleanK, item);
    if (item.koreanName) {
      const cleanKor = cleanToken(item.koreanName);
      if (cleanKor) userMap.set(cleanKor, item);
    }
  });

  // 2. 카테고리 노드 맵 생성
  const nodeMap = new Map<string, KpicTreeNode>();
  const rootNodes: KpicTreeNode[] = [];

  const rawCategories = kpicLiveDump.categories as Array<{
    kpicatc_code: string;
    YAKHYO1: string;
    eYAKHYO: string;
    YAKHYO2: string;
    YAKHYO3: string;
    yakhyo4: string | number;
  }>;

  rawCategories.forEach((cat) => {
    const code = cat.kpicatc_code;
    const len = code.length;
    const label =
      len === 1
        ? cat.YAKHYO1
        : len === 3
        ? cat.YAKHYO2
        : len === 4
        ? cat.YAKHYO3
        : String(cat.yakhyo4 || cat.YAKHYO3 || code);

    const level = len === 1 ? 1 : len === 3 ? 2 : len === 4 ? 3 : 4;

    nodeMap.set(code, {
      code,
      label: (label || code).trim(),
      ename: cat.eYAKHYO?.trim() || '',
      level,
      children: [],
      ingredients: [],
      totalIngredientsCount: 0,
      productIngredientsCount: 0,
      productNames: []
    });
  });

  // 3. 계층 관계(부모-자식) 연결
  rawCategories.forEach((cat) => {
    const code = cat.kpicatc_code;
    const len = code.length;
    const node = nodeMap.get(code);
    if (!node) return;

    if (len === 1) {
      rootNodes.push(node);
    } else {
      let parentCode =
        len === 3 ? code[0] : len === 4 ? code.substring(0, 3) : code.substring(0, 4);

      if (!nodeMap.has(parentCode)) parentCode = code.substring(0, 3);
      if (!nodeMap.has(parentCode)) parentCode = code[0];

      const parentNode = nodeMap.get(parentCode);
      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });

  // 4. 공식 성분들 연결 및 사용자 등록 제품 데이터 병합
  const rawIngredients = kpicLiveDump.ingredients as Array<{
    kpicatc_code: string;
    kc1: string;
    kc2: string;
    kc3: string;
    kc4: string;
    aig_code: string;
    KPIC_SNAME: string;
    yakhyo4: number;
    KPIC_YAKHYO1: string;
    KPIC_YAKHYO2: string;
    KPIC_YAKHYO3: string;
    kpic_yakhyo04: string;
  }>;

  const matchedUserKeys = new Set<string>();

  rawIngredients.forEach((ing) => {
    const rawName = ing.KPIC_SNAME?.trim() || '';
    if (!rawName) return;

    // 타겟 카테고리 노드 결정
    const targetCode =
      ing.yakhyo4 > 0 && ing.kc4 && nodeMap.has(ing.kc4)
        ? ing.kc4
        : ing.kc3 && nodeMap.has(ing.kc3)
        ? ing.kc3
        : ing.kc2 && nodeMap.has(ing.kc2)
        ? ing.kc2
        : ing.kc1;

    const targetNode = nodeMap.get(targetCode);
    if (!targetNode) return;

    // 사용자 데이터와 매칭
    const cleanN = cleanToken(rawName);

    // 1순위: 등록 제품에 포함된 성분(productCount > 0) 우선 매칭
    let matchedUser = userIngredients.find(
      (u) =>
        u.productCount > 0 &&
        (cleanToken(u.englishInn) === cleanN ||
          u.key === rawName.toLowerCase() ||
          (cleanN.length >= 4 && cleanToken(u.englishInn).includes(cleanN)) ||
          (cleanN.length >= 4 && cleanN.includes(cleanToken(u.englishInn))))
    );

    // 2순위: 등록 제품에 없을 경우 일반 사전 및 마스터 데이터베이스 매칭
    if (!matchedUser) {
      matchedUser =
        userMap.get(rawName.toLowerCase()) ||
        userMap.get(cleanN) ||
        userIngredients.find(
          (u) =>
            cleanToken(u.englishInn) === cleanN ||
            (cleanN.length >= 4 && cleanToken(u.englishInn).includes(cleanN)) ||
            (cleanN.length >= 4 && cleanN.includes(cleanToken(u.englishInn)))
        );
    }

    if (matchedUser) {
      matchedUserKeys.add(matchedUser.key);
    }

    const officialCat =
      ing.kpic_yakhyo04 || ing.KPIC_YAKHYO3 || ing.KPIC_YAKHYO2 || ing.KPIC_YAKHYO1 || '기타';

    const ingEntry: KpicTreeIngredient = {
      key: matchedUser ? matchedUser.key : rawName.toLowerCase(),
      kpicCode: ing.kpicatc_code,
      englishInn: matchedUser?.englishInn || rawName,
      koreanName: matchedUser?.koreanName || (/[가-힣]/.test(rawName) ? rawName : ''),
      chemicalFormName: matchedUser?.chemicalFormName,
      functionalCategory: matchedUser?.functionalCategory
        ? normalizeCategory(matchedUser.functionalCategory)
        : normalizeCategory(officialCat),
      productNames: matchedUser ? matchedUser.productNames : [],
      productCount: matchedUser ? matchedUser.productCount : 0
    };

    targetNode.ingredients.push(ingEntry);
  });

  // 5. 사용자가 등록한 제품 성분 중 아직 트리에 배치되지 않은 잔여 성분들 적절한 카테고리에 편입
  const unmappedUserIngredients = userIngredients.filter(
    (u) => u.productCount > 0 && !matchedUserKeys.has(u.key)
  );

  if (unmappedUserIngredients.length > 0) {
    unmappedUserIngredients.forEach((u) => {
      // 카테고리 이름으로 타겟 노드 탐색
      const targetCat = normalizeCategory(u.functionalCategory);
      let foundNode: KpicTreeNode | undefined;

      // 1순위: 카테고리 라벨 완전 일치 (예: '기타 비타민B' -> P02AZ)
      for (const node of nodeMap.values()) {
        if (node.label === targetCat) {
          foundNode = node;
          break;
        }
      }

      // 2순위: 도메인 계열별 엄격 매칭 (항생제/기타 등 엉뚱한 노드로 빠지는 것 방지)
      if (!foundNode) {
        if (targetCat.includes('비타민B')) {
          foundNode = nodeMap.get('P02AZ') || nodeMap.get('P02A') || nodeMap.get('P02');
        } else if (targetCat.includes('비타민C')) {
          foundNode = nodeMap.get('P02BA') || nodeMap.get('P02B') || nodeMap.get('P02');
        } else if (targetCat.includes('비타민D')) {
          foundNode = nodeMap.get('P01CA') || nodeMap.get('P01C') || nodeMap.get('P01');
        } else if (targetCat.includes('비타민E')) {
          foundNode = nodeMap.get('P01DA') || nodeMap.get('P01D') || nodeMap.get('P01');
        } else if (targetCat.includes('비타민A')) {
          foundNode = nodeMap.get('P01AA') || nodeMap.get('P01');
        } else if (targetCat.includes('비타민')) {
          foundNode = nodeMap.get('P02') || nodeMap.get('P01') || nodeMap.get('P05');
        } else if (targetCat.includes('미네랄') || targetCat.includes('마그네슘') || targetCat.includes('칼슘') || targetCat.includes('아연') || targetCat.includes('셀레늄') || targetCat.includes('철') || targetCat.includes('크롬')) {
          foundNode = nodeMap.get('P04');
        } else if (targetCat.includes('아미노산')) {
          foundNode = nodeMap.get('P03');
        } else if (targetCat.includes('소화')) {
          foundNode = nodeMap.get('B08') || nodeMap.get('B01');
        } else if (targetCat.includes('간')) {
          foundNode = nodeMap.get('B08A') || nodeMap.get('B08');
        }
      }

      // 3순위: '기타'를 제외한 의미 있는 3글자 이상 부분 일치
      if (!foundNode) {
        for (const node of nodeMap.values()) {
          if (node.label !== '기타' && node.label.length >= 3) {
            if (node.label.includes(targetCat) || targetCat.includes(node.label)) {
              foundNode = node;
              break;
            }
          }
        }
      }

      // 4순위: 안전한 일반 영양제/약물 Fallback
      if (!foundNode) {
        foundNode = nodeMap.get('P99Z') || nodeMap.get('P99') || nodeMap.get('Z99');
      }

      if (foundNode) {
        foundNode.ingredients.push({
          key: u.key,
          kpicCode: 'CUSTOM',
          englishInn: u.englishInn,
          koreanName: u.koreanName,
          chemicalFormName: u.chemicalFormName,
          functionalCategory: targetCat,
          productNames: u.productNames,
          productCount: u.productCount
        });
      }
    });
  }

  // 6. 재귀적으로 totalIngredientsCount, productIngredientsCount 및 제품명 집계
  function aggregateNode(node: KpicTreeNode) {
    let ingCount = node.ingredients.length;
    let prodCount = node.ingredients.filter((i) => i.productCount > 0).length;
    const prodNamesSet = new Set<string>();

    node.ingredients.forEach((i) => {
      i.productNames.forEach((pn) => prodNamesSet.add(pn));
    });

    node.children.forEach((child) => {
      aggregateNode(child);
      ingCount += child.totalIngredientsCount;
      prodCount += child.productIngredientsCount;
      child.productNames.forEach((pn) => prodNamesSet.add(pn));
    });

    node.totalIngredientsCount = ingCount;
    node.productIngredientsCount = prodCount;
    node.productNames = Array.from(prodNamesSet);
  }

  rootNodes.forEach(aggregateNode);

  return rootNodes;
}

/**
 * 검색어, 선택된 카테고리, 등록 제품 필터링 적용 및 자동 펼침 노드 코드 계산
 */
export function filterKpicTree(
  tree: KpicTreeNode[],
  query: string,
  selectedCategory: string,
  onlyInProducts: boolean
): {
  filteredTree: KpicTreeNode[];
  autoExpandedCodes: Set<string>;
  totalMatchedIngredients: number;
} {
  const q = query.trim().toLowerCase();
  const autoExpandedCodes = new Set<string>();
  let totalMatchedIngredients = 0;

  function filterNode(node: KpicTreeNode): KpicTreeNode | null {
    // 1. 하위 성분 필터링
    const matchedIngredients = node.ingredients.filter((ing) => {
      if (onlyInProducts && ing.productCount === 0) return false;
      if (
        selectedCategory !== 'ALL' &&
        ing.functionalCategory !== selectedCategory
      ) {
        return false;
      }
      if (!q) return true;

      const matchInn = ing.englishInn.toLowerCase().includes(q);
      const matchKor = ing.koreanName.toLowerCase().includes(q);
      const matchCat = ing.functionalCategory.toLowerCase().includes(q);
      const matchProd = ing.productNames.some((p) => p.toLowerCase().includes(q));
      const matchCode = ing.kpicCode.toLowerCase().includes(q);

      return matchInn || matchKor || matchCat || matchProd || matchCode;
    });

    // 2. 하위 자식 노드 재귀 필터링
    const matchedChildren: KpicTreeNode[] = [];
    for (const child of node.children) {
      const filteredChild = filterNode(child);
      if (filteredChild) {
        matchedChildren.push(filteredChild);
      }
    }

    // 3. 노드 자체 이름 매칭 여부
    const nodeSelfMatch =
      Boolean(q) &&
      (node.label.toLowerCase().includes(q) ||
        node.ename.toLowerCase().includes(q) ||
        node.code.toLowerCase().includes(q));

    // 이 노드가 보여져야 하는 조건
    const hasIngredients = matchedIngredients.length > 0;
    const hasChildren = matchedChildren.length > 0;

    if (!hasIngredients && !hasChildren && !nodeSelfMatch) {
      return null;
    }

    if (hasIngredients) {
      totalMatchedIngredients += matchedIngredients.length;
    }

    // 검색어 매칭 시 상위 트리 자동 펼침 등록
    if (q && (hasIngredients || hasChildren || nodeSelfMatch)) {
      autoExpandedCodes.add(node.code);
    }

    // 카운트 재계산
    let totalCount = matchedIngredients.length;
    let prodCount = matchedIngredients.filter((i) => i.productCount > 0).length;
    const prodNamesSet = new Set<string>();

    matchedIngredients.forEach((i) => {
      i.productNames.forEach((pn) => prodNamesSet.add(pn));
    });

    matchedChildren.forEach((child) => {
      totalCount += child.totalIngredientsCount;
      prodCount += child.productIngredientsCount;
      child.productNames.forEach((pn) => prodNamesSet.add(pn));
    });

    return {
      ...node,
      children: matchedChildren,
      ingredients: matchedIngredients,
      totalIngredientsCount: totalCount,
      productIngredientsCount: prodCount,
      productNames: Array.from(prodNamesSet)
    };
  }

  const filteredTree: KpicTreeNode[] = [];
  for (const root of tree) {
    const res = filterNode(root);
    if (res) filteredTree.push(res);
  }

  return { filteredTree, autoExpandedCodes, totalMatchedIngredients };
}
