import poster2024Regular from '../../../../2024정기공연.jpg';
import poster2025Early from '../../../../2025초반공연포스터.jpg';
import poster2025Regular from '../../../../2025정기공연.webp';
import poster2025Summer from '../../../../2025여름공연포스터.jpg';
import photo2025Mt from '../../../../2025뮤즈MT사진.png';
import photo2025Regular from '../../../../2025정기공연사진.png';

export const heroContent = {
  title: 'MUSE',
  descriptionLines: [
    '안녕하세요. 우리는 올해로 42년째 이어오고 있는 밴드 동아리 MUSE입니다.',
    '여러 장르의 다양한 음악으로 매년 두 번의 정기 공연을 열고 있습니다.',
    '신입 부원부터 기존 부원까지 함께 합주하고 공연을 준비하며,',
    '이후에는 YB와 OB가 함께 동아리의 흐름을 이어가고 있습니다.',
  ],
};

export const introKeywords = ['42년 전통', '연 2회 정기 공연', '신입 부원 모집', 'YB · OB 활동'];

export const performancePosters = [
  {
    title: '2024 정기 공연',
    description: '당해의 무드를 압축해서 보여 주는 공연 포스터입니다.',
    src: poster2024Regular,
    alt: 'MUSE 2024 정기 공연 포스터',
  },
  {
    title: '2025 초반 공연',
    description: '공연 시즌 초반의 분위기와 콘셉트를 담은 포스터입니다.',
    src: poster2025Early,
    alt: 'MUSE 2025 초반 공연 포스터',
  },
  {
    title: '2025 정기 공연',
    description: '메인 공연 시즌을 대표하는 정기 공연 포스터입니다.',
    src: poster2025Regular,
    alt: 'MUSE 2025 정기 공연 포스터',
  },
  {
    title: '2025 여름 공연',
    description: '여름 시즌 공연의 무드를 담은 포스터입니다.',
    src: poster2025Summer,
    alt: 'MUSE 2025 여름 공연 포스터',
  },
] as const;

export const galleryPhotos = [
  {
    title: '공연사진',
    caption: '무대 위에서 음악과 함께 남긴 MUSE의 공연 기록입니다.',
    src: photo2025Regular,
    alt: 'MUSE 2025 정기 공연사진',
  },
  {
    title: '활동사진',
    caption: '합주, 모임, MT처럼 함께 웃고 어울리는 MUSE의 순간들입니다.',
    src: photo2025Mt,
    alt: 'MUSE 2025 MT 활동사진',
  },
];

export const videoItems = [
  {
    title: '뮤즈 공연 아카이브',
    description: '공연의 흐름을 다시 볼 수 있도록 모아 둔 영상 아카이브입니다.',
    thumbnail: 'https://img.youtube.com/vi/WVbU6dc315k/hqdefault.jpg',
    meta: '아카이브',
    href: 'https://www.youtube.com/watch?v=WVbU6dc315k&list=PLuna_FqxOxWkOFYn5D0fwlQaoLovE_6tb',
  },
  {
    title: '뮤즈 브이로그',
    description: '공연 준비와 동아리 활동의 분위기를 가볍게 볼 수 있는 영상입니다.',
    thumbnail: 'https://img.youtube.com/vi/SqRmlOscfUE/hqdefault.jpg',
    meta: '브이로그',
    href: 'https://www.youtube.com/watch?v=SqRmlOscfUE&list=PLuna_FqxOxWmLS7Zppu0r730hMBvmwAeR',
  },
];
