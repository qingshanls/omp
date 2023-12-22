import { useState, useEffect, Key, CSSProperties, useRef } from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import usePlayQueueStore from '../../store/usePlayQueueStore'
import usePlayerStore from '../../store/usePlayerStore'
import useUiStore from '../../store/useUiStore'
import usePictureStore from '@/store/usePictureStore'
import { checkFileType, shufflePlayQueue } from '../../utils'
import CommonMenu from './CommonMenu'
import { PlayQueueItem } from '../../types/playQueue'
import { File } from '../../types/file'
import CommonListItem from './CommonListItem'
import ShuffleAll from './ShuffleAll'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { AutoSizer, List } from 'react-virtualized'
import CommonListItemCard from './CommonListItemCard'

const CommonList = (
  {
    listData,
    display = 'list',
    func,
  }: {
    listData?: File[] | PlayQueueItem[],
    display?: 'list' | 'multicolumnList' | 'grid',
    func?: {
      handleClickRemove?: (filePathArray: string[][]) => void,
    },
  }) => {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentFile, setCurrentFile] = useState<null | File>(null)

  const [folderTree, shuffle, updateVideoViewIsShow, updateFolderTree, updateShuffle] = useUiStore(
    (state) => [state.folderTree, state.shuffle, state.updateVideoViewIsShow, state.updateFolderTree, state.updateShuffle])

  const [currentIndex, updateType, updatePlayQueue, updateCurrentIndex] = usePlayQueueStore(
    (state) => [state.currentIndex, state.updateType, state.updatePlayQueue, state.updateCurrentIndex])

  const [updatePlayStatu] = usePlayerStore(state => [state.updatePlayStatu])

  const [
    updatePictureList,
    updateCurrentPicture,
  ] = usePictureStore(
    state => [
      state.updatePictureList,
      state.updateCurrentPicture,
    ]
  )

  const handleClickMenu = (event: React.MouseEvent<HTMLElement>, currentFile: File) => {
    setMenuOpen(true)
    setCurrentFile(currentFile)
    setAnchorEl(event.currentTarget)
  }

  // 点击列表项
  const handleClickListItem = (filePath: string[]) => {
    if (listData) {
      const currentFile = listData.find(item => item.filePath === filePath)

      if (currentFile && currentFile.fileType === 'folder') {
        updateFolderTree([...folderTree, currentFile.fileName])
      }

      if (currentFile && currentFile.fileType === 'picture') {
        const list = listData.filter(item => item.fileType === 'picture')
        updatePictureList(list)
        updateCurrentPicture(currentFile)
      }

      if (currentFile && (currentFile.fileType === 'audio' || currentFile.fileType === 'video')) {
        let currentIndex = 0
        const list = listData
          .filter((item) => item.fileType === currentFile.fileType)
          .map((item, index) => {
            if (currentFile?.filePath === item.filePath)
              currentIndex = index
            return { index, ...item }
          })
        if (shuffle) {
          updateShuffle(false)
        }
        updateType(currentFile.fileType)
        updatePlayQueue(list)
        updateCurrentIndex(currentIndex)
        updatePlayStatu('playing')
        if (currentFile.fileType === 'video') {
          updateVideoViewIsShow(true)
        }
      }
    }
  }

  // 点击播放队列列表
  const handleClickPlayQueueItem = (index: number) => {
    updatePlayStatu('playing')
    updateCurrentIndex(index)
  }

  // 点击随机播放全部
  const handleClickShuffleAll = () => {
    if (listData) {
      const list = listData
        .filter((item) => checkFileType(item.fileName) === 'audio')
        .map((item, index) => { return { index, ...item } })
      if (!shuffle)
        updateShuffle(true)
      updateType('audio')
      const shuffleList = shufflePlayQueue(list)
      updatePlayQueue(shuffleList)
      updateCurrentIndex(shuffleList[0].index)
      updatePlayStatu('playing')
    }
  }

  const handleClickItem = (item: PlayQueueItem | File) =>
    ((item as PlayQueueItem).index)
      ? handleClickPlayQueueItem((item as PlayQueueItem).index)
      : handleClickListItem(item.filePath)


  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs'))
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const md = useMediaQuery(theme.breakpoints.up('md'))
  const lg = useMediaQuery(theme.breakpoints.up('lg'))
  const xl = useMediaQuery(theme.breakpoints.up('xl'))

  const getGridCols = (): number => {
    if (xl) return 6
    if (lg) return 5
    if (md) return 4
    if (sm) return 3
    if (xs) return 2
    return 2
  }

  const getListCols = (): number => {
    if (xl) return 3
    if (lg) return 3
    if (md) return 2
    if (sm) return 1
    if (xs) return 1
    return 1
  }

  const gridCols = getGridCols()
  const listCols = (display === 'multicolumnList') ? getListCols() : 1

  const gridRenderer = ({ key, index, style }: { key: Key, index: number, style: CSSProperties }) => {
    return (
      listData
      &&
      <Grid container key={key} style={style}>
        {
          [...Array(gridCols)].map((_, i) => {
            const item = listData[index * gridCols + i]
            return (
              item
              &&
              <Grid key={item.fileName} xs={12 / gridCols} sx={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                <CommonListItemCard
                  active={((item as PlayQueueItem).index === currentIndex)}
                  item={item}
                  handleClickItem={handleClickItem}
                  handleClickMenu={handleClickMenu}
                />
              </Grid>
            )
          })
        }
      </Grid>
    )
  }

  const rowRenderer = ({ key, index, style }: { key: Key, index: number, style: CSSProperties }) => {
    return (
      listData
      &&
      <Grid container key={key} style={style}>
        {
          [...Array(listCols)].map((_, i) => {
            const item = listData[index * listCols + i]
            return (
              item
              &&
              <Grid key={item.fileName} xs={12 / listCols}>
                <CommonListItem
                  active={((item as PlayQueueItem).index === currentIndex)}
                  item={item}
                  handleClickItem={handleClickItem}
                  handleClickMenu={handleClickMenu}
                />
              </Grid>
            )
          })
        }
      </Grid>
    )
  }

  const listRef = useRef<List | null>(null)
  const updateListRowHeight = () => listRef.current && listRef.current.recomputeRowHeights()

  const isPlayQueueView = listData?.some((item) => typeof (item as PlayQueueItem).index === 'number')
  // 打开播放队列时滚动到当前播放文件
  useEffect(
    () => {
      if (isPlayQueueView && listRef.current) {
        const index = listData?.findIndex((item) => (item as PlayQueueItem).index === currentIndex)
        setTimeout(() => listRef.current?.scrollToRow(index), 100)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    listData
    &&
    <Box sx={{
      height: '100%',
      width: '100%',
    }}>
      {/* 菜单 */}
      <CommonMenu
        anchorEl={anchorEl}
        menuOpen={menuOpen}
        dialogOpen={dialogOpen}
        currentFile={currentFile}
        setAnchorEl={setAnchorEl}
        setMenuOpen={setMenuOpen}
        setDialogOpen={setDialogOpen}
        handleClickRemove={func?.handleClickRemove}
        isPlayQueueView={isPlayQueueView}
      />

      {/* 文件列表 */}
      <Grid container sx={{ flexDirection: 'column', flexWrap: 'nowrap', height: '100%' }}>
        {
          (
            listData.length !== 0
            && listData.find((item) => item.fileType === 'audio')
            && !isPlayQueueView
          )
          &&
          <Grid xs={12}>
            <ShuffleAll handleClickShuffleAll={handleClickShuffleAll} />
          </Grid>
        }
        <Grid xs={12}
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
          }}>
          {
            display === 'grid'
            &&
            <AutoSizer onResize={() => updateListRowHeight()}>
              {
                ({ height, width }) =>
                  <List
                    ref={(ref => (listRef.current = ref))}
                    height={height}
                    width={width}
                    rowCount={Math.ceil(listData.length / gridCols)}
                    rowHeight={width / gridCols}
                    rowRenderer={gridRenderer}
                    scrollToAlignment={'center'}
                    style={{
                      paddingBottom: '0.5rem',
                    }}
                  />
              }
            </AutoSizer>
          }
          {
            (display === 'list' || display === 'multicolumnList')
            &&
            <AutoSizer onResize={() => updateListRowHeight()}>
              {
                ({ height, width }) =>

                  <List
                    ref={(ref => (listRef.current = ref))}
                    height={height}
                    width={width}
                    rowCount={Math.ceil(listData.length / listCols)}
                    rowHeight={72}
                    rowRenderer={rowRenderer}
                    scrollToAlignment={'center'}
                    style={{
                      paddingBottom: '1rem',
                    }}
                  />
              }
            </AutoSizer>
          }

        </Grid>
      </Grid>
    </Box>
  )
}

export default CommonList